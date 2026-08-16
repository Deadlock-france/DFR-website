import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireShowmatchIngestAuth } from "@/lib/bot/ingest-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { SHOWMATCH_EVENTS_CACHE_TAG } from "@/lib/showmatch/data";
import {
  applyIngestScheduledAtDefault,
  validateIngestPayload,
} from "@/lib/showmatch/ingest-payload";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const authError = requireShowmatchIngestAuth(request);
  if (authError) return authError;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const ingestPayload = applyIngestScheduledAtDefault(payload);
  const validationError = validateIngestPayload(ingestPayload);
  if (validationError) {
    return badRequest(validationError);
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("ingest_showmatch", {
      payload: ingestPayload,
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
