import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

let browserClient: SupabaseClient | undefined;

/** Client navigateur singleton — évite multi-instances / multi-refresh. */
export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    isSingleton: true,
  });

  return browserClient;
}
