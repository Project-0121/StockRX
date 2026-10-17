import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async (_req, { params }) => {
  const batchId = params.id as string;
  const admin = getAdminClient();

  const { data: batch, error } = await admin
    .from("v_batch_status")
    .select("*")
    .eq("id", batchId)
    .single();

  if (error || !batch) {
    return jsonError("Batch not found.", "NOT_FOUND", 404);
  }

  // Also fetch movements for this specific batch
  const { data: movements } = await admin
    .from("stock_movements")
    .select(`
      id,
      movement_type,
      reason,
      quantity,
      batch_balance_after,
      notes,
      created_at,
      performer:profiles(full_name, email)
    `)
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  return jsonSuccess({
    ...(batch as Record<string, unknown>),
    movements: movements || [],
  });
});
