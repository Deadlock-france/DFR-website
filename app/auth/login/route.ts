import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { maybeAttachSiteAccessForUser } from "@/lib/admin/admins";
import { safeInternalPath } from "@/lib/navigation/safe-path";
import {
  isSiteAccessEnabled,
  SITE_ACCESS_COOKIE,
  verifySiteAccessToken,
} from "@/lib/site-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = safeInternalPath(searchParams.get("next"), "/profil");

  const supabase = await createClient();

  // Déjà connecté : pas de nouveau tour Discord (évite les boucles post-callback).
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData?.claims?.sub) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const { data: userData } = await supabase.auth.getUser();
    let attached = false;
    try {
      attached = await maybeAttachSiteAccessForUser(response, {
        userId: String(claimsData.claims.sub),
        identities: userData.user?.identities,
      });
    } catch (error) {
      console.error("Admin site-access cookie on login failed:", error);
    }

    if (!attached && isSiteAccessEnabled()) {
      const jar = await cookies();
      if (!verifySiteAccessToken(jar.get(SITE_ACCESS_COOKIE)?.value)) {
        const acces = new URL("/acces", origin);
        acces.searchParams.set("next", next);
        acces.searchParams.set("error", "not_admin");
        return NextResponse.redirect(acces);
      }
    }

    return response;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      // identify suffit : le site n’envoie pas d’e-mail (minimisation RGPD).
      scopes: "identify",
    },
  });

  if (error || !data.url) {
    console.error("Discord OAuth start failed:", error);
    return NextResponse.redirect(`${origin}/?authError=discord`);
  }

  return NextResponse.redirect(data.url);
}
