import { medicineSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/medicines/[id] - Details + Batches + Recent movements
export const GET = withApi(async (_req, { params }) => {
  const medicineId = params.id as string;
  const admin = getAdminClient();

  // 1. Fetch medicine overview
  const { data: medicine, error: medError } = await admin
    .from("v_medicine_stock")
    .select("*")
    .eq("id", medicineId)
    .single();

  if (medError || !medicine) {
    return jsonError("Medicine not found.", "NOT_FOUND", 404);
  }

  // 2. Fetch associated batches
  const { data: batches, error: batchError } = await admin
    .from("v_batch_status")
    .select("*")
    .eq("medicine_id", medicineId)
    .order("expiry_date", { ascending: true });

  if (batchError) {
    return jsonError(batchError.message, "FETCH_BATCHES_FAILED", 500);
  }

  // 3. Fetch recent stock movements (last 10)
  const { data: movements, error: mvtError } = await admin
    .from("stock_movements")
    .select(`
      id,
      batch_id,
      movement_type,
      reason,
      quantity,
      batch_balance_after,
      notes,
      created_at,
      batch:batches(batch_number),
      performer:profiles(full_name, email)
    `)
    .eq("medicine_id", medicineId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (mvtError) {
    return jsonError(mvtError.message, "FETCH_MOVEMENTS_FAILED", 500);
  }

  return jsonSuccess({
    medicine,
    batches: batches || [],
    recentMovements: movements || [],
  });
});

// PATCH /api/medicines/[id] - Update medicine
export const PATCH = withApi(async (req, { params }) => {
  const medicineId = params.id as string;
  const body = await req.json();
  const parsed = medicineSchema.parse(body);

  const admin = getAdminClient();

  const { data: updated, error } = await admin
    .from("medicines")
    .update({
      name: parsed.name,
      generic_name: parsed.generic_name || null,
      category_id: parsed.category_id || null,
      strength: parsed.strength,
      dosage_form: parsed.dosage_form,
      unit_price: parsed.unit_price,
      reorder_level: parsed.reorder_level,
      default_supplier_id: parsed.default_supplier_id || null,
      description: parsed.description || null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", medicineId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(
        `Another medicine with name "${parsed.name}", strength "${parsed.strength}" and form "${parsed.dosage_form}" already exists.`,
        "DUPLICATE_MEDICINE",
        409
      );
    }
    return jsonError(error.message, "UPDATE_MEDICINE_FAILED", 400);
  }

  return jsonSuccess(updated);
});

// DELETE /api/medicines/[id] - Admin-only soft delete (rejects if active or expired stock remains)
export const DELETE = withApi(
  async (_req, { params }) => {
    const medicineId = params.id as string;
    const admin = getAdminClient();

    // Check stock presence in v_medicine_stock
    const { data: stockInfoData, error: stockCheckError } = await admin
      .from("v_medicine_stock")
      .select("sellable_quantity, expired_quantity, total_quantity_all, name")
      .eq("id", medicineId)
      .single();

    if (stockCheckError || !stockInfoData) {
      return jsonError("Medicine not found.", "NOT_FOUND", 404);
    }

    const stockInfo = stockInfoData as {
      sellable_quantity: number;
      expired_quantity: number;
      total_quantity_all: number;
      name: string;
    };

    if (stockInfo.total_quantity_all > 0) {
      return jsonError(
        `Cannot deactivate medicine "${stockInfo.name}": There are still ${stockInfo.total_quantity_all} units remaining in inventory (sellable: ${stockInfo.sellable_quantity}, expired: ${stockInfo.expired_quantity}). All stock must be dispensed or written off first.`,
        "STOCK_REMAINS",
        409
      );
    }

    const { error: deactivateError } = await admin
      .from("medicines")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", medicineId);

    if (deactivateError) {
      return jsonError(deactivateError.message, "DEACTIVATE_FAILED", 500);
    }

    return jsonSuccess({ message: `Medicine "${stockInfo.name}" has been deactivated.` });
  },
  { roles: ["admin"] }
);
