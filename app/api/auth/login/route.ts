import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonSuccess } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Simple in-memory rate limiting: 5 attempts per 60 seconds per IP+email
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (record.count >= 5) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return jsonError("Please provide a valid email and password.", "VALIDATION_ERROR", 400);
    }

    const { email, password } = result.data;
    const ip = req.headers.get("x-forwarded-for") || req.ip || "unknown";
    const rateLimitKey = `${ip}:${email.toLowerCase()}`;

    if (!checkRateLimit(rateLimitKey)) {
      return jsonError(
        "Too many login attempts. Please wait 1 minute before trying again.",
        "RATE_LIMITED",
        429
      );
    }

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return jsonError("Invalid email or password.", "INVALID_CREDENTIALS", 401);
    }

    // Check profile active status using admin client
    const admin = getAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return jsonError("User profile not found.", "FORBIDDEN", 403);
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return jsonError(
        "Your account has been deactivated. Please contact your system administrator.",
        "ACCOUNT_DEACTIVATED",
        403
      );
    }

    return jsonSuccess({
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      profile,
    });
  } catch (error) {
    console.error("[Login Route Error]", error);
    return jsonError("An unexpected error occurred during login.", "INTERNAL_ERROR", 500);
  }
}
