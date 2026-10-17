import { movementQuerySchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const parsed = movementQuerySchema.parse(searchParams);

  const { medicineId, type, reason, from, to, page, pageSize } = parsed;

  const admin = getAdminClient();
  let query = admin.from("stock_movements").select(
    `
      id,
      medicine_id,
      batch_id,
      movement_type,
      reason,
      quantity,
      batch_balance_after,
      reference_id,
      notes,
      created_at,
      medicine:medicines(id, name, strength, dosage_form),
      batch:batches(id, batch_number, expiry_date),
      performer:profiles(id, full_name, email)
    `,
    { count: "exact" }
  );

  if (medicineId) {
    query = query.eq("medicine_id", medicineId);
  }

  if (type) {
    query = query.eq("movement_type", type);
  }

  if (reason) {
    query = query.eq("reason", reason);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", `${to}T23:59:59.999Z`);
  }

  query = query.order("created_at", { ascending: false });

  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;
  query = query.range(rangeFrom, rangeTo);

  const { data: movements, count, error } = await query;

  if (error) {
    return jsonError(error.message, "FETCH_MOVEMENTS_FAILED", 500);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return jsonSuccess(movements, {
    page,
    pageSize,
    total,
    totalPages,
  });
});
