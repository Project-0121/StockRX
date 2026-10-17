import { settingsSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/settings - Read pharmacy settings (authenticated)
export const GET = withApi(async () => {
  const admin = getAdminClient();
  const { data: rows, error } = await admin.from("app_settings").select("key, value");

  if (error) {
    return jsonError(error.message, "SETTINGS_FETCH_FAILED", 500);
  }

  const settingsMap: Record<string, string> = {};
  ((rows as any[]) || []).forEach((r) => {
    settingsMap[r.key] = r.value;
  });

  return jsonSuccess({
    pharmacy_name: settingsMap["pharmacy_name"] || "PharmaTrack Pharmacy",
    near_expiry_days: parseInt(settingsMap["near_expiry_days"] || "60", 10),
    default_reorder_level: parseInt(settingsMap["default_reorder_level"] || "20", 10),
  });
});

// PATCH /api/settings - Update pharmacy settings (admin only)
export const PATCH = withApi(
  async (req) => {
    const body = await req.json();
    const parsed = settingsSchema.parse(body);

    const admin = getAdminClient();

    const updates = [
      { key: "pharmacy_name", value: parsed.pharmacy_name },
      { key: "near_expiry_days", value: String(parsed.near_expiry_days) },
      { key: "default_reorder_level", value: String(parsed.default_reorder_level) },
    ];

    for (const item of updates) {
      const { error } = await admin
        .from("app_settings")
        .upsert(item as any, { onConflict: "key" });

      if (error) {
        return jsonError(error.message, "SETTINGS_UPDATE_FAILED", 500);
      }
    }

    return jsonSuccess({
      pharmacy_name: parsed.pharmacy_name,
      near_expiry_days: parsed.near_expiry_days,
      default_reorder_level: parsed.default_reorder_level,
    });
  },
  { roles: ["admin"] }
);
