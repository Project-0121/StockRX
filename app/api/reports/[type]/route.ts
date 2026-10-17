import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { getAdminClient } from "@/lib/supabase/admin";
import { generateCsv } from "@/lib/csv/export";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_REPORT_TYPES = [
  "stock-summary",
  "low-stock",
  "expiry",
  "purchases",
  "stock-movements",
] as const;

type ReportType = (typeof VALID_REPORT_TYPES)[number];

export const GET = withApi(async (req: NextRequest, { params }) => {
  const type = params.type as ReportType;

  if (!VALID_REPORT_TYPES.includes(type)) {
    return jsonError(
      `Invalid report type "${type}". Must be one of: ${VALID_REPORT_TYPES.join(", ")}`,
      "INVALID_REPORT_TYPE",
      400
    );
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const formatType = url.searchParams.get("format") || "json";

  const admin = getAdminClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  let headers: string[] = [];
  let rows: (string | number | null | undefined)[][] = [];
  let jsonData: unknown = null;

  switch (type) {
    case "stock-summary": {
      const { data: stockData, error } = await admin
        .from("v_medicine_stock")
        .select("*")
        .order("name", { ascending: true });

      if (error) return jsonError(error.message, "REPORT_FETCH_FAILED", 500);

      jsonData = stockData;
      headers = [
        "Medicine Name",
        "Generic Name",
        "Strength",
        "Dosage Form",
        "Category",
        "Sellable Stock",
        "Expired Stock",
        "Total Stock",
        "Reorder Level",
        "Unit Price (INR)",
        "Stock Valuation (INR)",
        "Earliest Expiry",
        "Status",
      ];
      rows = ((stockData as any[]) || []).map((m) => [
        m.name,
        m.generic_name || "",
        m.strength,
        m.dosage_form,
        m.category_name || "Uncategorized",
        m.sellable_quantity,
        m.expired_quantity,
        m.total_quantity_all,
        m.reorder_level,
        m.unit_price,
        m.stock_value,
        m.earliest_expiry || "N/A",
        m.stock_status,
      ]);
      break;
    }

    case "low-stock": {
      const { data: lowStockData, error } = await admin
        .from("v_medicine_stock")
        .select("*")
        .eq("is_active", true)
        .or("is_low_stock.eq.true,stock_status.eq.OUT_OF_STOCK")
        .order("sellable_quantity", { ascending: true });

      if (error) return jsonError(error.message, "REPORT_FETCH_FAILED", 500);

      jsonData = lowStockData;
      headers = [
        "Medicine Name",
        "Strength",
        "Dosage Form",
        "Category",
        "Current Stock",
        "Reorder Level",
        "Deficit to Order",
        "Supplier",
        "Status",
      ];
      rows = ((lowStockData as any[]) || []).map((m) => [
        m.name,
        m.strength,
        m.dosage_form,
        m.category_name || "Uncategorized",
        m.sellable_quantity,
        m.reorder_level,
        Math.max(0, m.reorder_level - m.sellable_quantity),
        m.supplier_name || "None",
        m.stock_status,
      ]);
      break;
    }

    case "expiry": {
      const { data: expiryData, error } = await admin
        .from("v_batch_status")
        .select("*")
        .gt("quantity", 0)
        .or("expiry_status.eq.EXPIRED,expiry_status.eq.NEAR_EXPIRY")
        .order("expiry_date", { ascending: true });

      if (error) return jsonError(error.message, "REPORT_FETCH_FAILED", 500);

      jsonData = expiryData;
      headers = [
        "Batch Number",
        "Medicine Name",
        "Strength",
        "Remaining Quantity",
        "Expiry Date",
        "Days to Expiry",
        "Expiry Status",
        "Supplier",
      ];
      rows = ((expiryData as any[]) || []).map((b) => [
        b.batch_number,
        b.medicine_name,
        b.strength,
        b.quantity,
        b.expiry_date,
        b.days_to_expiry,
        b.expiry_status,
        b.supplier_name || "N/A",
      ]);
      break;
    }

    case "purchases": {
      let query = admin.from("purchases").select(`
        id,
        invoice_number,
        purchase_date,
        total_cost,
        notes,
        created_at,
        supplier:suppliers(name),
        items:purchase_items(quantity, unit_cost, batch_number, expiry_date, medicine:medicines(name, strength))
      `);

      if (from) query = query.gte("purchase_date", from);
      if (to) query = query.lte("purchase_date", to);

      query = query.order("purchase_date", { ascending: false });
      const { data: purchasesData, error } = await query;

      if (error) return jsonError(error.message, "REPORT_FETCH_FAILED", 500);

      jsonData = purchasesData;
      headers = [
        "Purchase Date",
        "Invoice Number",
        "Supplier",
        "Total Cost (INR)",
        "Items Received",
        "Notes",
      ];
      rows = ((purchasesData as any[]) || []).map((p) => {
        const itemsSummary = (p.items || [])
          .map((i: any) => `${i.medicine?.name} ${i.medicine?.strength} (${i.quantity} units @ ₹${i.unit_cost})`)
          .join("; ");
        return [
          p.purchase_date,
          p.invoice_number || "N/A",
          (p.supplier as any)?.name || "N/A",
          p.total_cost,
          itemsSummary,
          p.notes || "",
        ];
      });
      break;
    }

    case "stock-movements": {
      let query = admin.from("stock_movements").select(`
        id,
        movement_type,
        reason,
        quantity,
        batch_balance_after,
        notes,
        created_at,
        medicine:medicines(name, strength),
        batch:batches(batch_number),
        performer:profiles(full_name)
      `);

      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

      query = query.order("created_at", { ascending: false });
      const { data: movementsData, error } = await query;

      if (error) return jsonError(error.message, "REPORT_FETCH_FAILED", 500);

      jsonData = movementsData;
      headers = [
        "Timestamp",
        "Movement Type",
        "Reason",
        "Medicine",
        "Batch",
        "Quantity",
        "Batch Balance After",
        "Performed By",
        "Notes",
      ];
      rows = (movementsData || []).map((m: any) => [
        format(new Date(m.created_at), "yyyy-MM-dd HH:mm:ss"),
        m.movement_type,
        m.reason,
        `${m.medicine?.name || ""} ${m.medicine?.strength || ""}`.trim(),
        m.batch?.batch_number || "N/A",
        m.quantity,
        m.batch_balance_after,
        m.performer?.full_name || "System",
        m.notes || "",
      ]);
      break;
    }
  }

  if (formatType === "csv") {
    const csvContent = generateCsv(headers, rows);
    const filename = `${type}-${todayStr}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return jsonSuccess({
    type,
    generatedAt: new Date().toISOString(),
    totalRecords: rows.length,
    data: jsonData,
  });
});
