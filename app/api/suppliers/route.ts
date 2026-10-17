import { supplierQuerySchema, supplierSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, sanitizeSearchParam, withApi } from "@/lib/api/handler";
import { Supplier } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/suppliers - List suppliers
export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const parsed = supplierQuerySchema.parse(searchParams);

  const { search, page, pageSize, sort, order } = parsed;

  const admin = getAdminClient();
  let query = admin.from("suppliers").select("*", { count: "exact" });

  if (search) {
    const sanitized = sanitizeSearchParam(search);
    if (sanitized) {
      query = query.or(
        `name.ilike.%${sanitized}%,contact_person.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
      );
    }
  }

  const sortColumn = sort || "name";
  query = query.order(sortColumn, { ascending: order !== "desc" });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: suppliers, count, error } = await query;

  if (error) {
    return jsonError(error.message, "FETCH_SUPPLIERS_FAILED", 500);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return jsonSuccess(suppliers as Supplier[], {
    page,
    pageSize,
    total,
    totalPages,
  });
});

// POST /api/suppliers - Create supplier
export const POST = withApi(async (req) => {
  const body = await req.json();
  const parsed = supplierSchema.parse(body);

  const admin = getAdminClient();

  const { data: newSupplier, error } = await admin
    .from("suppliers")
    .insert({
      name: parsed.name,
      contact_person: parsed.contact_person || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
      is_active: true,
    } as any)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(`A supplier with name "${parsed.name}" already exists.`, "DUPLICATE_SUPPLIER", 409);
    }
    return jsonError(error.message, "CREATE_SUPPLIER_FAILED", 400);
  }

  return jsonSuccess(newSupplier, undefined, 201);
});
