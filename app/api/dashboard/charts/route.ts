import { format, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async () => {
  const admin = getAdminClient();

  // 1. Stock by Category
  const { data: medicines, error: medError } = await admin
    .from("v_medicine_stock")
    .select("category_name, sellable_quantity, stock_value")
    .eq("is_active", true);

  if (medError) {
    return jsonError(medError.message, "FETCH_MEDICINES_FAILED", 500);
  }

  const categoryAggregates: Record<string, { total_units: number; stock_value: number }> = {};
  ((medicines as any[]) || []).forEach((m) => {
    const cat = m.category_name || "Uncategorized";
    if (!categoryAggregates[cat]) {
      categoryAggregates[cat] = { total_units: 0, stock_value: 0 };
    }
    categoryAggregates[cat].total_units += m.sellable_quantity || 0;
    categoryAggregates[cat].stock_value += Number(m.stock_value || 0);
  });

  const stockByCategory = Object.entries(categoryAggregates).map(([name, data]) => ({
    name,
    total_units: data.total_units,
    stock_value: Math.round(data.stock_value),
  }));

  // 2. Purchases Per Month (Last 12 months with zero-fill)
  const now = new Date();
  const monthsList: { key: string; label: string; startDate: string; endDate: string }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i);
    const sDate = format(startOfMonth(d), "yyyy-MM-dd");
    const eDate = format(endOfMonth(d), "yyyy-MM-dd");
    monthsList.push({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM yy"),
      startDate: sDate,
      endDate: eDate,
    });
  }

  const earliestDate = monthsList[0].startDate;
  const { data: historicalPurchases } = await admin
    .from("purchases")
    .select("purchase_date, total_cost")
    .gte("purchase_date", earliestDate);

  const purchasesPerMonth = monthsList.map((m) => {
    const matched = ((historicalPurchases as any[]) || []).filter(
      (p) => p.purchase_date >= m.startDate && p.purchase_date <= m.endDate
    );
    const total_cost = matched?.reduce((sum, p) => sum + Number(p.total_cost || 0), 0) || 0;
    return {
      month: m.label,
      total_cost: Math.round(total_cost),
      count: matched?.length || 0,
    };
  });

  // 3. Top Low Stock Items (top 5 by deficit: reorder_level - sellable_quantity)
  const { data: lowStockCandidates } = await admin
    .from("v_medicine_stock")
    .select("id, name, strength, sellable_quantity, reorder_level, stock_status")
    .eq("is_active", true)
    .or("is_low_stock.eq.true,stock_status.eq.OUT_OF_STOCK");

  const topLowStock = (((lowStockCandidates as any[]) || []))
    .map((m) => ({
      name: `${m.name} ${m.strength}`,
      current: m.sellable_quantity,
      reorder: m.reorder_level,
      deficit: Math.max(0, m.reorder_level - m.sellable_quantity),
    }))
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 5);

  // 4. Movements Per Week (Last 8 weeks)
  const weeksList: { label: string; startDate: string; endDate: string }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = subWeeks(now, i);
    weeksList.push({
      label: i === 0 ? "Current" : `${i}w ago`,
      startDate: format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00"),
      endDate: format(endOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59"),
    });
  }

  const earliestWeekDate = weeksList[0].startDate;
  const { data: historicalMovements } = await admin
    .from("stock_movements")
    .select("movement_type, created_at")
    .gte("created_at", earliestWeekDate);

  const movementsPerWeek = weeksList.map((w) => {
    const inCount = ((historicalMovements as any[]) || []).filter(
      (m) => m.movement_type === "IN" && m.created_at >= w.startDate && m.created_at <= w.endDate
    ).length || 0;

    const outCount = ((historicalMovements as any[]) || []).filter(
      (m) => m.movement_type === "OUT" && m.created_at >= w.startDate && m.created_at <= w.endDate
    ).length || 0;

    return {
      week: w.label,
      in: inCount,
      out: outCount,
    };
  });

  return jsonSuccess({
    stockByCategory,
    purchasesPerMonth,
    topLowStock,
    movementsPerWeek,
  });
});
