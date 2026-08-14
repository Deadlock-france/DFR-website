/**
 * Interprète une date/heure showmatch.
 * - Avec fuseau (Z / ±hh:mm) : parse standard
 * - Sans fuseau (souvent envoyé par le bot en heure FR) : Europe/Paris
 */

const NAIVE_LOCAL =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

const HAS_TZ = /([zZ]|[+-]\d{2}:?\d{2})$/;

function parisOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(instant);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = raw.match(/GMT([+-])(\d+)(?::?(\d{2}))?/i);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes) * 60_000;
}

/** Convertit un timestamp naïf (heure de Paris) en ISO UTC. */
export function interpretParisLocalAsUtcIso(naive: string): string {
  const match = naive.trim().match(NAIVE_LOCAL);
  if (!match) return naive;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");

  // Estimation initiale : UTC = composants locaux, puis correction d’offset Paris.
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i += 1) {
    const offset = parisOffsetMs(new Date(utcMs));
    utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }
  return new Date(utcMs).toISOString();
}

export function hasExplicitTimeZone(value: string): boolean {
  return HAS_TZ.test(value.trim());
}

/** Normalise une date ingest / affichage vers un Instant fiable. */
export function parseShowmatchInstant(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);
  if (hasExplicitTimeZone(trimmed)) return new Date(trimmed);
  return new Date(interpretParisLocalAsUtcIso(trimmed));
}

/** Pour l’ingest : conserve les dates timezone-aware, sinon assume Paris. */
export function normalizeIngestDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (hasExplicitTimeZone(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }
  return interpretParisLocalAsUtcIso(trimmed);
}
