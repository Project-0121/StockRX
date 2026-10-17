import { medicineQuerySchema, medicineSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, sanitizeSearchParam, withApi } from "@/lib/api/handler";
import { MedicineStockView } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/medicines - List medicines with search, filters, and pagination
export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const parsed = medicineQuerySchema.parse(searchParams);

  const { search, category, supplier, status, includeInactive, page, pageSize, sort, order } = parsed;

  const admin = getAdminClient();
  let query = admin.from("v_medicine_stock").select("*", { count: "exact" });

  // Inactive filter
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  // Category filter
  if (category) {
    query = query.eq("category_id", category);
  }

  // Supplier filter
  if (supplier) {
    query = query.eq("default_supplier_id", supplier);
  }

  // Stock status filter
  if (status) {
    query = query.eq("stock_status", status);
  }

  // Search filter (name, generic_name, strength)
  if (search) {
    const sanitized = sanitizeSearchParam(search);
    if (sanitized) {
      query = query.or(
        `name.ilike.%${sanitized}%,generic_name.ilike.%${sanitized}%,strength.ilike.%${sanitized}%`
      );
    }
  }

  // Sorting
  const sortColumn = sort || "name";
  const isAscending = order !== "desc";
  query = query.order(sortColumn, { ascending: isAscending });

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: medicines, count, error } = await query;

  if (error) {
    return jsonError(error.message, "FETCH_MEDICINES_FAILED", 500);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return jsonSuccess(medicines as MedicineStockView[], {
    page,
    pageSize,
    total,
    totalPages,
  });
});

// POST /api/medicines - Create new medicine
export const POST = withApi(async (req) => {
  const body = await req.json();
  const parsed = medicineSchema.parse(body);

  const admin = getAdminClient();

  const { data: newMedicine, error } = await admin
    .from("medicines")
    .insert({
      name: parsed.name,
      generic_name: parsed.generic_name || null,
      category_id: parsed.category_id || null,
      strength: parsed.strength,
      dosage_form: parsed.dosage_form,
      unit_price: parsed.unit_price,
      reorder_level: parsed.reorder_level,
      default_supplier_id: parsed.default_supplier_id || null,
      description: parsed.description || null,
      is_active: true,
    } as any)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(
        `A medicine named "${parsed.name}" with strength "${parsed.strength}" and form "${parsed.dosage_form}" already exists.`,
        "DUPLICATE_MEDICINE",
        409
      );
    }
    return jsonError(error.message, "MEDICINE_CREATION_FAILED", 400);
  }

  return jsonSuccess(newMedicine, undefined, 201);
});
