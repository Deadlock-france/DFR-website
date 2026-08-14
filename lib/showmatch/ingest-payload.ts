import { normalizeIngestDateTime } from "@/lib/showmatch/timezone";

const VALID_STATUSES = new Set([
  "scheduled",
  "teams_formed",
  "in_progress",
  "completed",
  "cancelled",
]);

/** Validation minimale : champs requis seulement. Les champs en trop sont ignorés. */
export function validateIngestPayload(payload: unknown): string | null {
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

/**
 * Si `scheduled_at` est absent / vide / non-string, on le remplit avec l’instant d’ingest.
 * Une date avec fuseau (Z / ±offset) est normalisée en ISO UTC.
 * Une date naïve (sans fuseau) est interprétée comme heure Europe/Paris
 * — cas fréquent côté bot Discord.
 */
export function applyIngestScheduledAtDefault(
  payload: unknown,
  nowIso: () => string = () => new Date().toISOString(),
): unknown {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const body = payload as Record<string, unknown>;
  const scheduled = body.scheduled_at;
  if (typeof scheduled === "string" && scheduled.trim()) {
    const normalized = normalizeIngestDateTime(scheduled);
    if (normalized === scheduled) return payload;
    return { ...body, scheduled_at: normalized };
  }

  return { ...body, scheduled_at: nowIso() };
}
