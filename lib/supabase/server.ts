import { createServerClient } from "@supabase/ssr";
import { connection } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Client serveur avec écriture cookies (login / logout / actions).
 * Ne pas utiliser pour les lectures RSC/API — Set-Cookie y déclenche
 * un soft-refresh Next (cacheComponents) en boucle.
 */
export async function createClient() {
  // Empêche cookies() pendant le prerender (HANGING_PROMISE_REJECTION).
  await connection();
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const current = cookieStore.get(name)?.value;
            if (current === value) return;
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component : le Proxy a déjà rafraîchi la session.
        }
      },
    },
  });
}

/**
 * Lectures auth/données uniquement — jamais de Set-Cookie.
 * Le rafraîchissement de session reste exclusif au proxy (navigations).
 */
export async function createReadonlyClient() {
  // Empêche cookies() pendant le prerender (HANGING_PROMISE_REJECTION).
  await connection();
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op
      },
    },
  });
}
