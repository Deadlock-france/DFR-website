import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Client anon / publishable pour lectures publiques (RLS).
 * Serveur uniquement — pas de session cookie.
 */
export function createPublicClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error("Supabase public env is not configured");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
