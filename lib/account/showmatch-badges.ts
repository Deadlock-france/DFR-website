export type ShowmatchBadgeId =
  | "first_game"
  | "first_win"
  | "wins_5"
  | "wins_10"
  | "first_mvp"
  | "mvp_5"
  | "mvp_10"
  | "games_10";

export type ShowmatchBadgeDef = {
  id: ShowmatchBadgeId;
  title: string;
  description: string;
  minGames?: number;
  minWins?: number;
  minMvps?: number;
};

export const SHOWMATCH_BADGE_DEFS: readonly ShowmatchBadgeDef[] = [
  {
    id: "first_game",
    title: "Première game",
    description: "A joué un showmatch.",
    minGames: 1,
  },
  {
    id: "first_win",
    title: "Première victoire",
    description: "A gagné une game de showmatch.",
    minWins: 1,
  },
  {
    id: "first_mvp",
    title: "MVP",
    description: "Élu MVP une fois.",
    minMvps: 1,
  },
  {
    id: "games_10",
    title: "Fidèle",
    description: "10 games de showmatch.",
    minGames: 10,
  },
  {
    id: "wins_5",
    title: "En série",
    description: "5 victoires en showmatch.",
    minWins: 5,
  },
  {
    id: "mvp_5",
    title: "Star du lobby",
    description: "MVP 5 fois.",
    minMvps: 5,
  },
  {
    id: "wins_10",
    title: "Habitué des lobbys",
    description: "10 victoires en showmatch.",
    minWins: 10,
  },
  {
    id: "mvp_10",
    title: "Légende",
    description: "MVP 10 fois.",
    minMvps: 10,
  },
];

export type ShowmatchBadgeStats = {
  games: number;
  wins: number;
  mvps: number;
};

export type ShowmatchBadge = {
  id: ShowmatchBadgeId;
  title: string;
  description: string;
};

export function tallyShowmatchBadgeStats(
  rows: Array<{ won?: boolean | null; is_mvp?: boolean | null }>,
): ShowmatchBadgeStats {
  let games = 0;
  let wins = 0;
  let mvps = 0;

  for (const row of rows) {
    games += 1;
    if (row.won === true) wins += 1;
    if (row.is_mvp === true) mvps += 1;
  }

  return { games, wins, mvps };
}

export function earnedShowmatchBadges(
  stats: ShowmatchBadgeStats,
): ShowmatchBadge[] {
  return SHOWMATCH_BADGE_DEFS.filter((def) => {
    if (def.minGames != null && stats.games < def.minGames) return false;
    if (def.minWins != null && stats.wins < def.minWins) return false;
    if (def.minMvps != null && stats.mvps < def.minMvps) return false;
    return true;
  }).map(({ id, title, description }) => ({ id, title, description }));
}
