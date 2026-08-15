import { NextResponse } from "next/server";

import {
  ADMIN_ELEVATION_COOKIE,
  ADMIN_ELEVATION_MAX_AGE_SECONDS,
  createAdminElevationToken,
  getAdminIdentity,
  isAdminUnlockConfigured,
  verifyAdminUnlockSecret,
} from "@/lib/admin/access";
import { safeInternalPath } from "@/lib/navigation/safe-path";

export async function POST(request: Request) {
  if (!isAdminUnlockConfigured()) {
    return NextResponse.json(
      { ok: false, error: "admin_unlock_unconfigured" },
      { status: 503 },
    );
  }

  const identity = await getAdminIdentity();
  if (!identity) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 404 });
  }

  let secret = "";
  let next = "/admin";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      secret?: unknown;
      next?: unknown;
    } | null;
    secret = typeof body?.secret === "string" ? body.secret : "";
    next = typeof body?.next === "string" ? body.next : "/admin";
  } else {
    const form = await request.formData().catch(() => null);
    secret = String(form?.get("secret") ?? "");
    next = String(form?.get("next") ?? "/admin");
  }

  if (!verifyAdminUnlockSecret(secret)) {
    return NextResponse.json(
      { ok: false, error: "invalid_secret" },
      { status: 401 },
    );
  }

  const safeNext = safeInternalPath(next, "/admin");
  const response = NextResponse.json({ ok: true, next: safeNext });
  response.cookies.set({
    name: ADMIN_ELEVATION_COOKIE,
    value: createAdminElevationToken(identity.discordId),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_ELEVATION_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_ELEVATION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
