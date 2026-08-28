import { connection } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Fenêtre du graphe d’inscriptions (semaines glissantes). */
export const SIGNUP_CHART_WEEKS = 12;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Garde-fous : le dashboard agrège en mémoire, jamais toute la table. */
const MAX_SIGNUP_ROWS = 5000;
const MAX_GAME_ROWS = 5000;
const MAX_PARTICIPANT_ROWS = 20000;

export type WeeklyBucket = {
  /** Début de la fenêtre (ISO). */
  start: string;
  label: string;
  count: number;
};

export type HeroPick = {
  heroId: number;
  picks: number;
};

export type SiteStats = {
  generatedAt: string;
  members: {
    total: number;
    last7d: number;
    last30d: number;
    previous30d: number;
    /** Variation 30 j vs 30 j précédents, null si base nulle. */
    trend: number | null;
  };
  signupsByWeek: WeeklyBucket[];
  teams: number;
  applications: number;
  players: {
    total: number;
    claimed: number;
  };
  showmatches: {
    total: number;
    completed: number;
    upcoming: number;
    series: number;
  };
  gameplay: {
    games: number;
    participations: number;
    playtimeSeconds: number;
    averageDurationSeconds: number;
    kills: number;
    souls: number;
  };
  topHeroes: HeroPick[];
};

function shortDayLabel(time: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(time));
}

/**
 * Répartit des dates ISO en fenêtres de 7 jours glissantes finissant à `now`.
 * Dernier bucket = 7 derniers jours.
 */
export function weeklyBuckets(
  isoDates: readonly string[],
  now: Date,
  weeks: number = SIGNUP_CHART_WEEKS,
): WeeklyBucket[] {
  const end = now.getTime();
  const buckets: WeeklyBucket[] = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = end - (index + 1) * WEEK_MS;
    buckets.push({
      start: new Date(start).toISOString(),
      label: shortDayLabel(start),
      count: 0,
    });
  }

  for (const iso of isoDates) {
    const time = Date.parse(iso);
    if (Number.isNaN(time) || time > end) continue;
    const index = weeks - 1 - Math.floor((end - time) / WEEK_MS);
    const bucket = buckets[index];
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

/** Nombre de dates dans les `days` derniers jours (fenêtre glissante). */
export function countSince(
  isoDates: readonly string[],
  now: Date,
  days: number,
): number {
  const end = now.getTime();
  const start = end - days * DAY_MS;
  let total = 0;
  for (const iso of isoDates) {
    const time = Date.parse(iso);
    if (Number.isNaN(time)) continue;
    if (time >= start && time <= end) total += 1;
  }
  return total;
}

/** Dates comprises dans [now - fromDays, now - toDays[ — période de comparaison. */
export function countBetween(
  isoDates: readonly string[],
  now: Date,
  fromDays: number,
  toDays: number,
): number {
  const start = now.getTime() - fromDays * DAY_MS;
  const end = now.getTime() - toDays * DAY_MS;
  let total = 0;
  for (const iso of isoDates) {
    const time = Date.parse(iso);
    if (Number.isNaN(time)) continue;
    if (time >= start && time < end) total += 1;
  }
  return total;
}

/** Variation en pourcentage, arrondie. Null quand la base est vide. */
export function trendPercent(
  current: number,
  previous: number,
): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function topHeroPicks(
  heroIds: readonly number[],
  limit: number,
): HeroPick[] {
  const counts = new Map<number, number>();
  for (const heroId of heroIds) {
    if (!Number.isInteger(heroId)) continue;
    counts.set(heroId, (counts.get(heroId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([heroId, picks]) => ({ heroId, picks }))
    .sort((a, b) => b.picks - a.picks || a.heroId - b.heroId)
    .slice(0, limit);
}

/** Durée lisible : « 12 h 30 » pour un cumul, « 32 min » en dessous d’une heure. */
export function formatDurationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, "0")}`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

type CountResult = { count: number | null; error: unknown };

function unwrapCount(result: CountResult): number {
  if (result.error) throw result.error;
  return result.count ?? 0;
}

function sumBy<T>(rows: readonly T[], pick: (row: T) => number | null): number {
  let total = 0;
  for (const row of rows) {
    const value = pick(row);
    if (typeof value === "number" && Number.isFinite(value)) total += value;
  }
  return total;
}

export async function loadSiteStats(): Promise<SiteStats> {
  // Chiffres temps réel : jamais prérendus (Cache Components).
  await connection();

  const supabase = createServiceRoleClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const windowStart = new Date(
    now.getTime() - SIGNUP_CHART_WEEKS * WEEK_MS,
  ).toISOString();

  const [
    profilesTotal,
    signupRows,
    teamsTotal,
    applicationsTotal,
    playersTotal,
    playersClaimed,
    showmatchesTotal,
    showmatchesCompleted,
    showmatchesUpcoming,
    seriesTotal,
    gameRows,
    participantsTotal,
    heroRows,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .then(unwrapCount),
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(MAX_SIGNUP_ROWS),
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .then(unwrapCount),
    supabase
      .from("site_applications")
      .select("id", { count: "exact", head: true })
      .then(unwrapCount),
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .then(unwrapCount),
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .not("claimed_at", "is", null)
      .then(unwrapCount),
    supabase
      .from("showmatches")
      .select("id", { count: "exact", head: true })
      .then(unwrapCount),
    supabase
      .from("showmatches")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .then(unwrapCount),
    supabase
      .from("showmatches")
      .select("id", { count: "exact", head: true })
      .gt("scheduled_at", nowIso)
      .neq("status", "completed")
      .then(unwrapCount),
    supabase
      .from("showmatch_series")
      .select("id", { count: "exact", head: true })
      .then(unwrapCount),
    supabase
      .from("showmatch_games")
      .select("duration_seconds, total_kills, total_souls")
      .limit(MAX_GAME_ROWS),
    supabase
      .from("showmatch_game_participants")
      .select("id", { count: "exact", head: true })
      .then(unwrapCount),
    supabase
      .from("showmatch_game_participants")
      .select("hero_id")
      .limit(MAX_PARTICIPANT_ROWS),
  ]);

  if (signupRows.error) throw signupRows.error;
  if (gameRows.error) throw gameRows.error;
  if (heroRows.error) throw heroRows.error;

  const signupDates = (signupRows.data ?? []).map((row) =>
    String(row.created_at),
  );
  const games = (gameRows.data ?? []) as Array<{
    duration_seconds: number | null;
    total_kills: number | null;
    total_souls: number | null;
  }>;
  const heroIds = (heroRows.data ?? [])
    .map((row) => Number(row.hero_id))
    .filter((heroId) => Number.isInteger(heroId));

  const playtimeSeconds = sumBy(games, (row) => row.duration_seconds);
  const timedGames = games.filter(
    (row) => typeof row.duration_seconds === "number" && row.duration_seconds > 0,
  ).length;
  const last30d = countSince(signupDates, now, 30);
  const previous30d = countBetween(signupDates, now, 60, 30);

  return {
    generatedAt: nowIso,
    members: {
      total: profilesTotal,
      last7d: countSince(signupDates, now, 7),
      last30d,
      previous30d,
      trend: trendPercent(last30d, previous30d),
    },
    signupsByWeek: weeklyBuckets(signupDates, now),
    teams: teamsTotal,
    applications: applicationsTotal,
    players: { total: playersTotal, claimed: playersClaimed },
    showmatches: {
      total: showmatchesTotal,
      completed: showmatchesCompleted,
      upcoming: showmatchesUpcoming,
      series: seriesTotal,
    },
    gameplay: {
      games: games.length,
      participations: participantsTotal,
      playtimeSeconds,
      averageDurationSeconds:
        timedGames > 0 ? Math.round(playtimeSeconds / timedGames) : 0,
      kills: sumBy(games, (row) => row.total_kills),
      souls: sumBy(games, (row) => row.total_souls),
    },
    topHeroes: topHeroPicks(heroIds, 6),
  };
}
