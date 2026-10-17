import { resetUserPasswordSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApi(
  async (req, { params }) => {
    const targetUserId = params.id as string;
    const body = await req.json();
    const parsed = resetUserPasswordSchema.parse(body);

    const admin = getAdminClient();

    const { error: resetError } = await admin.auth.admin.updateUserById(targetUserId, {
      password: parsed.new_password,
    });

    if (resetError) {
      return jsonError(resetError.message, "PASSWORD_RESET_FAILED", 500);
    }

    return jsonSuccess({ message: "User password reset successfully." });
  },
  { roles: ["admin"] }
);
