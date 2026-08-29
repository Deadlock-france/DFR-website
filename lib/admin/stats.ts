import { connection } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Périodes proposées sous le graphe d’inscriptions. */
export const SIGNUP_RANGE_OPTIONS = [
  { id: "4w", label: "4 semaines", weeks: 4 },
  { id: "12w", label: "3 mois", weeks: 12 },
  { id: "26w", label: "6 mois", weeks: 26 },
  { id: "52w", label: "1 an", weeks: 52 },
] as const;

export type SignupRangeId = (typeof SIGNUP_RANGE_OPTIONS)[number]["id"];

export const DEFAULT_SIGNUP_RANGE: SignupRangeId = "12w";

const MAX_SIGNUP_WEEKS = Math.max(
  ...SIGNUP_RANGE_OPTIONS.map((option) => option.weeks),
);

/** Nombre de héros visibles avant de déplier. */
export const TOP_HEROES_PREVIEW = 6;

/** Garde-fous : le dashboard agrège en mémoire, jamais toute la table. */
const MAX_SIGNUP_ROWS = 20000;
const MAX_GAME_ROWS = 5000;
const MAX_PARTICIPANT_ROWS = 20000;

export type WeeklyBucket = {
  /** Début de la fenêtre (ISO). */
  start: string;
  label: string;
  count: number;
};

export type SignupRange = {
  id: SignupRangeId;
  label: string;
  weeks: number;
  buckets: WeeklyBucket[];
  total: number;
  /** Semaine la plus forte : sert d’échelle au graphe. */
  peak: number;
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
  signupRanges: SignupRange[];
  teams: number;
  applications: number;
  players: {
    total: number;
    claimed: number;
  };
  showmatches: {
    total: number;
    upcoming: number;
  };
  gameplay: {
    games: number;
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
  weeks: number,
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

/** Une série par période proposée, pour basculer sans nouvel aller-retour. */
export function buildSignupRanges(
  isoDates: readonly string[],
  now: Date,
): SignupRange[] {
  return SIGNUP_RANGE_OPTIONS.map((option) => {
    const buckets = weeklyBuckets(isoDates, now, option.weeks);
    return {
      id: option.id,
      label: option.label,
      weeks: option.weeks,
      buckets,
      total: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
      peak: buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0),
    };
  });
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

/**
 * Classement des héros joués. Sans `limit`, renvoie tout le classement :
 * il reste borné par le roster Deadlock.
 */
export function topHeroPicks(
  heroIds: readonly number[],
  limit?: number,
): HeroPick[] {
  const counts = new Map<number, number>();
  for (const heroId of heroIds) {
    if (!Number.isInteger(heroId)) continue;
    counts.set(heroId, (counts.get(heroId) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .map(([heroId, picks]) => ({ heroId, picks }))
    .sort((a, b) => b.picks - a.picks || a.heroId - b.heroId);
  return limit === undefined ? ranked : ranked.slice(0, limit);
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
    now.getTime() - MAX_SIGNUP_WEEKS * WEEK_MS,
  ).toISOString();

  const [
    profilesTotal,
    signupRows,
    teamsTotal,
    applicationsTotal,
    playersTotal,
    playersClaimed,
    showmatchesTotal,
    showmatchesUpcoming,
    gameRows,
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
      .gt("scheduled_at", nowIso)
      .neq("status", "completed")
      .then(unwrapCount),
    supabase
      .from("showmatch_games")
      .select("duration_seconds, total_kills, total_souls")
      .limit(MAX_GAME_ROWS),
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
    signupRanges: buildSignupRanges(signupDates, now),
    teams: teamsTotal,
    applications: applicationsTotal,
    players: { total: playersTotal, claimed: playersClaimed },
    showmatches: {
      total: showmatchesTotal,
      upcoming: showmatchesUpcoming,
    },
    gameplay: {
      games: games.length,
      playtimeSeconds,
      averageDurationSeconds:
        timedGames > 0 ? Math.round(playtimeSeconds / timedGames) : 0,
      kills: sumBy(games, (row) => row.total_kills),
      souls: sumBy(games, (row) => row.total_souls),
    },
    topHeroes: topHeroPicks(heroIds),
  };
}
