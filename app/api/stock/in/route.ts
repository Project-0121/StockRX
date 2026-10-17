import { receiveStockSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApi(async (req, { user }) => {
  const body = await req.json();
  const parsed = receiveStockSchema.parse(body);

  const admin = getAdminClient();

  const purchaseItem = {
    medicine_id: parsed.medicine_id,
    batch_number: parsed.batch_number,
    quantity: parsed.quantity,
    unit_cost: parsed.unit_cost,
    expiry_date: parsed.expiry_date,
    manufacture_date: parsed.manufacture_date || null,
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: purchaseId, error: rpcError } = await admin.rpc("create_purchase", {
    p_supplier_id: parsed.supplier_id,
    p_invoice_number: parsed.invoice_number || `RCV-${Date.now().toString().slice(-6)}`,
    p_purchase_date: todayStr,
    p_notes: parsed.notes || "Direct stock receipt",
    p_items: [purchaseItem],
    p_user_id: user.id,
  } as any);

  if (rpcError) {
    throw rpcError;
  }

  return jsonSuccess({
    purchase_id: purchaseId,
    message: `Received ${parsed.quantity} units under batch ${parsed.batch_number}.`,
  });
});
