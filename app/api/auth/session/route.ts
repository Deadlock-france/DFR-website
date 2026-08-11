import { NextResponse } from "next/server";
import { connection } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { hasAuthCookies } from "@/lib/supabase/env";

/**
 * Rafraîchit la session une fois (appel client au boot).
 * N'écrit Set-Cookie que si la valeur change — un seul soft-refresh max.
 */
export async function POST() {
  try {
    await connection();
    const cookieStore = await cookies();
    if (!hasAuthCookies(cookieStore.getAll())) {
      return NextResponse.json({ ok: true, refreshed: false });
    }

    const supabase = await createClient();
    await supabase.auth.getClaims();
    return NextResponse.json({ ok: true, refreshed: true });
  } catch (error) {
    console.error("POST /api/auth/session failed:", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
