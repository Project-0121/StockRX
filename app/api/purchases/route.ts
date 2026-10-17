import { purchaseQuerySchema, purchaseSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/purchases - List purchases with date range and supplier filters
export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const parsed = purchaseQuerySchema.parse(searchParams);

  const { from, to, supplierId, page, pageSize } = parsed;

  const admin = getAdminClient();
  let query = admin
    .from("purchases")
    .select(
      `
      id,
      invoice_number,
      purchase_date,
      total_cost,
      notes,
      created_at,
      supplier:suppliers(id, name, phone, email),
      creator:profiles(full_name, email),
      items:purchase_items(id, quantity, unit_cost, batch_number, expiry_date, medicine:medicines(name, strength))
    `,
      { count: "exact" }
    );

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  if (from) {
    query = query.gte("purchase_date", from);
  }

  if (to) {
    query = query.lte("purchase_date", to);
  }

  query = query.order("purchase_date", { ascending: false }).order("created_at", { ascending: false });

  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;
  query = query.range(rangeFrom, rangeTo);

  const { data: purchases, count, error } = await query;

  if (error) {
    return jsonError(error.message, "FETCH_PURCHASES_FAILED", 500);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return jsonSuccess(purchases, {
    page,
    pageSize,
    total,
    totalPages,
  });
});

// POST /api/purchases - Create purchase via atomic RPC transaction
export const POST = withApi(async (req, { user }) => {
  const body = await req.json();
  const parsed = purchaseSchema.parse(body);

  const admin = getAdminClient();

  const { data: purchaseId, error: rpcError } = await admin.rpc("create_purchase", {
    p_supplier_id: parsed.supplier_id,
    p_invoice_number: parsed.invoice_number || null,
    p_purchase_date: parsed.purchase_date,
    p_notes: parsed.notes || null,
    p_items: parsed.items,
    p_user_id: user.id,
  } as any);

  if (rpcError) {
    throw rpcError; // Will be cleanly mapped to appropriate HTTP status by withApi handler
  }

  return jsonSuccess({ purchase_id: purchaseId }, undefined, 201);
});
