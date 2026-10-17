import { updateUserSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = withApi(
  async (req, { user, params }) => {
    const targetUserId = params.id as string;
    const body = await req.json();
    const parsed = updateUserSchema.parse(body);

    const admin = getAdminClient();

    // Fetch target user's current profile
    const { data: targetProfileData, error: targetError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfileData) {
      return jsonError("User not found.", "NOT_FOUND", 404);
    }

    const targetProfile = targetProfileData as any;

    // Rule: Admin cannot deactivate or demote themselves
    if (targetUserId === user.id) {
      if (parsed.is_active === false) {
        return jsonError("You cannot deactivate your own admin account.", "SELF_DEACTIVATION_PROHIBITED", 409);
      }
      if (parsed.role && parsed.role !== "admin") {
        return jsonError("You cannot demote your own admin account.", "SELF_DEMOTION_PROHIBITED", 409);
      }
    }

    // Rule: The last active admin can never be deactivated or demoted
    if (
      targetProfile.role === "admin" &&
      targetProfile.is_active &&
      (parsed.is_active === false || (parsed.role && parsed.role !== "admin"))
    ) {
      const { count: activeAdminCount, error: countError } = await admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("is_active", true);

      if (countError) {
        return jsonError("Failed to verify admin count.", "INTERNAL_ERROR", 500);
      }

      if ((activeAdminCount || 0) <= 1) {
        return jsonError(
          "Operation rejected: The system must retain at least one active administrator.",
          "LAST_ADMIN_PROTECTED",
          409
        );
      }
    }

    // Synchronize Supabase Auth status if is_active is modified
    if (parsed.is_active !== undefined) {
      const banDuration = parsed.is_active ? "none" : "876000h";
      await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: banDuration,
      });
    }

    // Update profile in database
    const updates: Record<string, unknown> = {};
    if (parsed.full_name !== undefined) updates.full_name = parsed.full_name;
    if (parsed.role !== undefined) updates.role = parsed.role;
    if (parsed.is_active !== undefined) updates.is_active = parsed.is_active;

    const { data: updatedProfile, error: updateError } = await admin
      .from("profiles")
      .update(updates as any)
      .eq("id", targetUserId)
      .select("*")
      .single();

    if (updateError) {
      return jsonError(updateError.message, "PROFILE_UPDATE_FAILED", 500);
    }

    return jsonSuccess(updatedProfile);
  },
  { roles: ["admin"] }
);
