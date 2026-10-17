import { dispenseStockSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApi(async (req, { user }) => {
  const body = await req.json();
  const parsed = dispenseStockSchema.parse(body);

  const admin = getAdminClient();

  const { data: result, error: rpcError } = await admin.rpc("dispense_stock", {
    p_medicine_id: parsed.medicine_id,
    p_quantity: parsed.quantity,
    p_reason: parsed.reason,
    p_notes: parsed.notes || "Stock dispensed",
    p_user_id: user.id,
  } as any);

  if (rpcError) {
    throw rpcError;
  }

  return jsonSuccess(result);
});
