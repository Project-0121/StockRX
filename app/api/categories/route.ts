import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async () => {
  const admin = getAdminClient();
  const { data: categories, error } = await admin
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    return jsonError(error.message, "FETCH_CATEGORIES_FAILED", 500);
  }

  return jsonSuccess(categories);
});
