import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/profil";
  const next = nextRaw.startsWith("/") ? nextRaw : "/profil";

  if (!code) {
    return NextResponse.redirect(`${origin}/?authError=callback`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Discord OAuth callback failed:", error);
    return NextResponse.redirect(`${origin}/?authError=callback`);
  }

  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub
      ? String(claimsData.claims.sub)
      : null;
    if (userId) {
      const { claimShowmatchPlayerForUser } = await import(
        "@/lib/account/showmatch-claim"
      );
      await claimShowmatchPlayerForUser(userId);
    }
  } catch (claimError) {
    console.error("Showmatch player claim after Discord login failed:", claimError);
  }

  return response;
}
