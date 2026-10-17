import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApi(async () => {
  const supabase = createClient();
  await supabase.auth.signOut();
  return jsonSuccess({ message: "Successfully logged out" });
});
