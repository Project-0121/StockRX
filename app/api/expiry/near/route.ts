import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const daysParam = parseInt(url.searchParams.get("days") || "60", 10);
  const thresholdDays = isNaN(daysParam) ? 60 : daysParam;

  const admin = getAdminClient();

  // Read batches from v_batch_status where quantity > 0, non-expired, and days_to_expiry <= thresholdDays
  const { data: batches, error } = await admin
    .from("v_batch_status")
    .select("*")
    .gt("quantity", 0)
    .gte("days_to_expiry", 0)
    .lte("days_to_expiry", thresholdDays)
    .order("expiry_date", { ascending: true });

  if (error) {
    return jsonError(error.message, "FETCH_NEAR_EXPIRY_FAILED", 500);
  }

  return jsonSuccess(batches || []);
});
