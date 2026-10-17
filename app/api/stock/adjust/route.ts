import { adjustStockSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApi(async (req, { user }) => {
  const body = await req.json();
  const parsed = adjustStockSchema.parse(body);

  const admin = getAdminClient();

  const { data: result, error: rpcError } = await admin.rpc("adjust_stock", {
    p_batch_id: parsed.batch_id,
    p_new_quantity: parsed.new_quantity,
    p_notes: parsed.notes,
    p_user_id: user.id,
  } as any);

  if (rpcError) {
    throw rpcError;
  }

  return jsonSuccess(result);
});
