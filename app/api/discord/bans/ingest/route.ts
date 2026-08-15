import { NextResponse } from "next/server";

import { ingestDiscordBan } from "@/lib/admin/deban";
import { validateBanIngestPayload } from "@/lib/admin/deban-types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function POST(request: Request) {
  const ingestSecret = process.env.DISCORD_BANS_INGEST_SECRET;
  if (!ingestSecret) {
    return NextResponse.json(
      { error: "Ingest endpoint is not configured" },
      { status: 503 },
    );
  }

  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token || !timingSafeEqual(token, ingestSecret)) {
    return unauthorized();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const validated = validateBanIngestPayload(payload);
  if (!validated.ok) {
    return badRequest(validated.error);
  }

  try {
    const result = await ingestDiscordBan(validated.data);
    return NextResponse.json({ ok: true, ban: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    if (message === "no_active_ban") {
      return badRequest(message);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
