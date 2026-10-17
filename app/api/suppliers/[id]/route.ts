import { supplierSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/suppliers/[id] - Details + purchase history
export const GET = withApi(async (_req, { params }) => {
  const supplierId = params.id as string;
  const admin = getAdminClient();

  const { data: supplier, error: supError } = await admin
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();

  if (supError || !supplier) {
    return jsonError("Supplier not found.", "NOT_FOUND", 404);
  }

  // Fetch purchase history for this supplier
  const { data: purchases, error: purError } = await admin
    .from("purchases")
    .select(`
      id,
      invoice_number,
      purchase_date,
      total_cost,
      notes,
      created_at,
      created_by,
      items:purchase_items(
        id,
        quantity,
        unit_cost,
        batch_number,
        expiry_date,
        medicine:medicines(name, strength)
      )
    `)
    .eq("supplier_id", supplierId)
    .order("purchase_date", { ascending: false });

  if (purError) {
    return jsonError(purError.message, "FETCH_PURCHASES_FAILED", 500);
  }

  return jsonSuccess({
    supplier,
    purchases: purchases || [],
  });
});

// PATCH /api/suppliers/[id] - Update supplier
export const PATCH = withApi(async (req, { params }) => {
  const supplierId = params.id as string;
  const body = await req.json();
  const parsed = supplierSchema.parse(body);

  const admin = getAdminClient();

  const { data: updated, error } = await admin
    .from("suppliers")
    .update({
      name: parsed.name,
      contact_person: parsed.contact_person || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", supplierId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(`A supplier named "${parsed.name}" already exists.`, "DUPLICATE_SUPPLIER", 409);
    }
    return jsonError(error.message, "UPDATE_SUPPLIER_FAILED", 400);
  }

  return jsonSuccess(updated);
});

// DELETE /api/suppliers/[id] - Admin-only soft delete
export const DELETE = withApi(
  async (_req, { params }) => {
    const supplierId = params.id as string;
    const admin = getAdminClient();

    const { data: supplier, error: checkError } = await admin
      .from("suppliers")
      .select("name")
      .eq("id", supplierId)
      .single();

    if (checkError || !supplier) {
      return jsonError("Supplier not found.", "NOT_FOUND", 404);
    }

    const { error: deactivateError } = await admin
      .from("suppliers")
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq("id", supplierId);

    if (deactivateError) {
      return jsonError(deactivateError.message, "DEACTIVATE_SUPPLIER_FAILED", 500);
    }

    return jsonSuccess({ message: `Supplier "${(supplier as any).name}" has been deactivated.` });
  },
  { roles: ["admin"] }
);
