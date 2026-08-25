/** Helpers d’affichage showmatch. */

import { parseShowmatchInstant } from "@/lib/showmatch/timezone";

/** Libellé Best-of déduit du score série (2+ victoires → BO3, sinon BO1). */
export function formatSeriesBestOf(
  scoreTeam1: number,
  scoreTeam2: number,
): string {
  return Math.max(scoreTeam1, scoreTeam2) >= 2 ? "BO3" : "BO1";
}

export function formatMatchDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatSouls(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

/** Affichage compact style Deadlock : 48 200 → 48k */
export function formatSoulsCompact(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : 1).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${Math.round(k)}k`;
  }
  return String(value);
}

export function formatMatchTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(parseShowmatchInstant(iso));
}

export function formatMatchDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(parseShowmatchInstant(iso));
}

export function formatEventDate(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(`${isoDate}T12:00:00+02:00`));
}

export function teamTotalSouls(
  players: ReadonlyArray<{ netWorth: number }>,
): number {
  return players.reduce((sum, p) => sum + p.netWorth, 0);
}

export function teamTotalKills(
  players: ReadonlyArray<{ kills: number }>,
): number {
  return players.reduce((sum, p) => sum + p.kills, 0);
}
