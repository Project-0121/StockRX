import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";
import { DashboardSummaryView } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async () => {
  const admin = getAdminClient();

  const { data: summary, error } = await admin
    .from("v_dashboard_summary")
    .select("*")
    .single();

  if (error) {
    return jsonError(error.message, "FETCH_SUMMARY_FAILED", 500);
  }

  return jsonSuccess(summary as DashboardSummaryView);
});
