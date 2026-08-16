import { NextResponse } from "next/server";

import {
  ingestDiscordBan,
  listApprovedDebansAwaitingLift,
} from "@/lib/admin/deban";
import { validateBanIngestPayload } from "@/lib/admin/deban-types";
import { requireShowmatchIngestAuth } from "@/lib/bot/ingest-auth";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Bot → site (même Bearer que `/api/showmatch/ingest` : `SHOWMATCH_INGEST_SECRET`).
 *
 * GET  — liste des débans admin-approuvés encore à lever sur Discord
 * POST — change le statut ban d’un joueur
 *   { action: "ban", discord_id, reason, banned_at?, banned_by_label? }
 *   { action: "lift", discord_id }
 */
export async function GET(request: Request) {
  const authError = requireShowmatchIngestAuth(request);
  if (authError) return authError;

  try {
    const pending_unbans = await listApprovedDebansAwaitingLift();
    return NextResponse.json({ ok: true, pending_unbans });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
