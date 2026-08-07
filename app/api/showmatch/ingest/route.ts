import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { SHOWMATCH_EVENTS_CACHE_TAG } from "@/lib/showmatch/data";

const VALID_STATUSES = new Set([
  "scheduled",
  "teams_formed",
  "in_progress",
  "completed",
  "cancelled",
]);

/** Validation minimale : champs requis seulement. Les champs en trop sont ignorés (pas de .strict). */

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

function validatePayload(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return "payload must be a JSON object";
  }

  const body = payload as Record<string, unknown>;

  if (body.schema_version !== 1) {
    return "schema_version must be 1";
  }

  if (typeof body.showmatch_id !== "string" || !body.showmatch_id.trim()) {
    return "showmatch_id is required";
  }

  if (typeof body.scheduled_at !== "string" || !body.scheduled_at.trim()) {
    return "scheduled_at is required";
  }

  if (
    typeof body.status !== "string" ||
    !VALID_STATUSES.has(body.status)
  ) {
    return "status must be scheduled, teams_formed, in_progress, completed, or cancelled";
  }

  if (body.series !== undefined && !Array.isArray(body.series)) {
    return "series must be an array when provided";
  }

  return null;
}

export async function POST(request: Request) {
  const ingestSecret = process.env.SHOWMATCH_INGEST_SECRET;
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

  const validationError = validatePayload(payload);
  if (validationError) {
    return badRequest(validationError);
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("ingest_showmatch", {
      payload,
    });

    if (error) {
      return badRequest(error.message);
    }

    revalidateTag(SHOWMATCH_EVENTS_CACHE_TAG, "max");

    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
