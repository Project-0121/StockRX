import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async () => {
  const admin = getAdminClient();

  const { data: movements, error } = await admin
    .from("stock_movements")
    .select(`
      id,
      movement_type,
      reason,
      quantity,
      batch_balance_after,
      notes,
      created_at,
      medicine:medicines(id, name, strength, dosage_form),
      batch:batches(id, batch_number, expiry_date),
      performer:profiles(id, full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return jsonError(error.message, "FETCH_RECENT_ACTIVITY_FAILED", 500);
  }

  return jsonSuccess(movements || []);
});
