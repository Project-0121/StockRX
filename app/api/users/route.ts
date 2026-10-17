import { createUserSchema } from "@/lib/schemas";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess, withApi } from "@/lib/api/handler";
import { Profile } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/users - List all users (admin only)
export const GET = withApi(
  async () => {
    const admin = getAdminClient();
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(error.message, "FETCH_USERS_FAILED", 500);
    }

    return jsonSuccess(profiles as Profile[]);
  },
  { roles: ["admin"] }
);

// POST /api/users - Create new user (admin only)
export const POST = withApi(
  async (req) => {
    const body = await req.json();
    const parsed = createUserSchema.parse(body);

    const admin = getAdminClient();

    // 1. Create auth user with service role
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.full_name,
      },
    });

    if (authError || !authData.user) {
      if (authError?.message?.includes("already registered") || authError?.status === 422) {
        return jsonError("A user with this email address already exists.", "USER_EXISTS", 409);
      }
      return jsonError(authError?.message || "Failed to create user.", "USER_CREATION_FAILED", 400);
    }

    const userId = authData.user.id;

    // 2. Set profile row with requested role (trigger defaults to staff)
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: parsed.full_name,
          email: parsed.email,
          role: parsed.role,
          is_active: true,
        } as any,
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (profileError) {
      return jsonError(profileError.message, "PROFILE_SAVE_FAILED", 500);
    }

    return jsonSuccess(profile, undefined, 201);
  },
  { roles: ["admin"] }
);
