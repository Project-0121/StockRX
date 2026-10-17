import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return jsonError("Unauthorized cron invocation.", "UNAUTHORIZED", 401);
    }

    const admin = getAdminClient();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Fetch dashboard summary counts
    const { data: summary, error: sumError } = await admin
      .from("v_dashboard_summary")
      .select("low_stock_count, near_expiry_count, expired_count")
      .single();

    if (sumError) {
      console.error("[Cron Daily Alerts] Error fetching metrics:", sumError);
      return jsonError("Failed to fetch alert metrics.", "METRICS_FETCH_FAILED", 500);
    }

    const summaryData = summary as any;
    const low_stock_count = summaryData?.low_stock_count || 0;
    const near_expiry_count = summaryData?.near_expiry_count || 0;
    const expired_count = summaryData?.expired_count || 0;

    // Insert log row into alerts_log
    const { data: logEntry, error: logError } = await admin
      .from("alerts_log")
      .insert({
        run_date: todayStr,
        low_stock_count,
        near_expiry_count,
        expired_count,
      } as any)
      .select("*")
      .single();

    if (logError) {
      console.error("[Cron Daily Alerts] Error logging alert:", logError);
      return jsonError("Failed to write to alerts_log.", "LOG_INSERT_FAILED", 500);
    }

    return jsonSuccess({
      message: "Daily alert metrics computed and recorded successfully.",
      log: logEntry,
    });
  } catch (error) {
    console.error("[Cron Daily Alerts Error]", error);
    return jsonError("Unexpected cron job failure.", "INTERNAL_ERROR", 500);
  }
}
