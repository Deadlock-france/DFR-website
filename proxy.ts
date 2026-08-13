import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/navigation/safe-path";
import {
  isSiteAccessEnabled,
  isSiteAccessPublicPath,
  SITE_ACCESS_COOKIE,
  verifySiteAccessToken,
} from "@/lib/site-access";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (isSiteAccessEnabled()) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
    const unlocked = verifySiteAccessToken(token);
    const isPublic = isSiteAccessPublicPath(pathname);

    if (!unlocked && !isPublic) {
      // Les API JSON ne doivent pas recevoir une redirection HTML.
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "site_locked" }, { status: 401 });
      }

      const url = request.nextUrl.clone();
      url.pathname = "/acces";
      const next = `${pathname}${request.nextUrl.search}`;
      if (next && next !== "/acces") {
        url.searchParams.set("next", next);
      }
      return NextResponse.redirect(url);
    }

    if (unlocked && pathname === "/acces") {
      const next = safeInternalPath(
        request.nextUrl.searchParams.get("next"),
        "/",
      );
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|otf|ttf|woff2?)$).*)",
  ],
};
