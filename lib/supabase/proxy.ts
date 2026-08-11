import { NextResponse, type NextRequest } from "next/server";

/**
 * Pas de refresh Supabase ici.
 * Avec Cache Components, un Set-Cookie sur GET page/RSC provoque un
 * soft-refresh en boucle. Le refresh session est fait une seule fois
 * côté client via POST /api/auth/session.
 */
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
