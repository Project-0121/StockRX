import "server-only";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

// Using SupabaseClient<any> allows dynamic PostgREST querying without rigid static schema conflicts
let adminClient: SupabaseClient<any> | null = null;

export function getAdminClient(): SupabaseClient<any> {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  adminClient = createSupabaseClient<any>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
