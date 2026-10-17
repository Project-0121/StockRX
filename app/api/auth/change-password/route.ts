import { changePasswordSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApi(async (req, { user }) => {
  const body = await req.json();
  const parsed = changePasswordSchema.parse(body);

  const supabase = createClient();

  // Verify current password first by attempting a re-authentication
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.currentPassword,
  });

  if (signInError) {
    return jsonError("Current password is incorrect.", "INVALID_PASSWORD", 400);
  }

  // Update password using admin client
  const admin = getAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.newPassword,
  });

  if (updateError) {
    return jsonError(updateError.message, "PASSWORD_UPDATE_FAILED", 500);
  }

  return jsonSuccess({ message: "Password updated successfully." });
});
