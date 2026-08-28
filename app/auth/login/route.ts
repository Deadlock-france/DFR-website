import { NextResponse } from "next/server";

import { safeInternalPath } from "@/lib/navigation/safe-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = safeInternalPath(searchParams.get("next"), "/profil");

  const supabase = await createClient();

  // Déjà connecté : pas de nouveau tour Discord (évite les boucles post-callback).
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData?.claims?.sub) {
    return NextResponse.redirect(`${origin}${next}`);
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
