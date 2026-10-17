import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async () => {
  const admin = getAdminClient();

  // 1. Fetch low stock medicines
  const { data: lowStock, error: lsError } = await admin
    .from("v_medicine_stock")
    .select("*")
    .eq("is_active", true)
    .or("is_low_stock.eq.true,stock_status.eq.OUT_OF_STOCK")
    .order("sellable_quantity", { ascending: true });

  if (lsError) {
    return jsonError(lsError.message, "FETCH_LOW_STOCK_FAILED", 500);
  }

  // 2. Fetch near expiry medicines
  const { data: nearExpiry, error: neError } = await admin
    .from("v_medicine_stock")
    .select("*")
    .eq("is_active", true)
    .eq("has_near_expiry", true)
    .order("earliest_expiry", { ascending: true });

  if (neError) {
    return jsonError(neError.message, "FETCH_NEAR_EXPIRY_FAILED", 500);
  }

  // 3. Fetch expired batches with remaining stock
  const { data: expired, error: expError } = await admin
    .from("v_batch_status")
    .select("*")
    .eq("expiry_status", "EXPIRED")
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true });

  if (expError) {
    return jsonError(expError.message, "FETCH_EXPIRED_FAILED", 500);
  }

  const counts = {
    lowStock: lowStock?.length || 0,
    nearExpiry: nearExpiry?.length || 0,
    expired: expired?.length || 0,
    total: (lowStock?.length || 0) + (nearExpiry?.length || 0) + (expired?.length || 0),
  };

  return jsonSuccess({
    lowStock: lowStock || [],
    nearExpiry: nearExpiry || [],
    expired: expired || [],
    counts,
  });
});
