import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";
import { BatchStatusView } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const medicineId = url.searchParams.get("medicineId");
  const expiryStatus = url.searchParams.get("expiryStatus");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20", 10), 100);

  const admin = getAdminClient();
  let query = admin.from("v_batch_status").select("*", { count: "exact" });

  if (medicineId) {
    query = query.eq("medicine_id", medicineId);
  }

  if (expiryStatus) {
    query = query.eq("expiry_status", expiryStatus);
  }

  query = query.order("expiry_date", { ascending: true });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: batches, count, error } = await query;

  if (error) {
    return jsonError(error.message, "FETCH_BATCHES_FAILED", 500);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return jsonSuccess(batches as BatchStatusView[], {
    page,
    pageSize,
    total,
    totalPages,
  });
});
