import { NextResponse } from "next/server";

import { safeInternalPath } from "@/lib/navigation/safe-path";
import {
  createSiteAccessToken,
  isSiteAccessEnabled,
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_MAX_AGE_SECONDS,
  verifySitePassword,
} from "@/lib/site-access";

export async function POST(request: Request) {
  if (!isSiteAccessEnabled()) {
    return NextResponse.json({ ok: true, enabled: false });
  }

  let password = "";
  let next = "/";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      password?: unknown;
      next?: unknown;
    } | null;
    password = typeof body?.password === "string" ? body.password : "";
    next = typeof body?.next === "string" ? body.next : "/";
  } else {
    const form = await request.formData().catch(() => null);
    password = String(form?.get("password") ?? "");
    next = String(form?.get("next") ?? "/");
  }

  if (!verifySitePassword(password)) {
    return NextResponse.json(
      { ok: false, error: "invalid_password" },
      { status: 401 },
    );
  }

  const safeNext = safeInternalPath(next, "/");
  const response = NextResponse.json({ ok: true, next: safeNext });
  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    value: createSiteAccessToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_ACCESS_MAX_AGE_SECONDS,
  });
  return response;
}
