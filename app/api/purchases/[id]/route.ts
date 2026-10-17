import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async (_req, { params }) => {
  const purchaseId = params.id as string;
  const admin = getAdminClient();

  const { data: purchase, error } = await admin
    .from("purchases")
    .select(
      `
      id,
      invoice_number,
      purchase_date,
      total_cost,
      notes,
      created_at,
      supplier:suppliers(id, name, contact_person, phone, email, address),
      creator:profiles(full_name, email),
      items:purchase_items(
        id,
        quantity,
        unit_cost,
        batch_number,
        expiry_date,
        batch_id,
        medicine:medicines(id, name, strength, dosage_form)
      )
    `
    )
    .eq("id", purchaseId)
    .single();

  if (error || !purchase) {
    return jsonError("Purchase not found.", "NOT_FOUND", 404);
  }

  return jsonSuccess(purchase);
});
