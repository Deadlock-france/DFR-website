/**
 * Clés publiques Supabase uniquement.
 * Interdit sb_secret_ / service_role — provoquent des boucles de refresh session.
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    );
  }

  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_* doit être la clé anon/publishable, pas une clé secret/service_role. " +
        "Une clé secret côté client casse l'auth et provoque des rechargements en boucle.",
    );
  }

  return key;
}

export function hasSupabasePublicEnv(): boolean {
  try {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) &&
        !(
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("sb_secret_") ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith(
            "sb_secret_",
          )
        ),
    );
  } catch {
    return false;
  }
}

/** Alias showmatch / lectures publiques optionnelles. */
export function isSupabaseConfigured(): boolean {
  return hasSupabasePublicEnv();
}

/** Cookies de session Supabase présents sur la requête. */
export function hasAuthCookies(
  cookies: Array<{ name: string; value: string }>,
): boolean {
  return cookies.some(
    (cookie) =>
      cookie.name.includes("-auth-token") && cookie.value.length > 0,
  );
}
