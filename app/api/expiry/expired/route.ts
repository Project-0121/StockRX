import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async () => {
  const admin = getAdminClient();

  const { data: batches, error } = await admin
    .from("v_batch_status")
    .select("*")
    .eq("expiry_status", "EXPIRED")
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true });

  if (error) {
    return jsonError(error.message, "FETCH_EXPIRED_FAILED", 500);
  }

  return jsonSuccess(batches || []);
});
