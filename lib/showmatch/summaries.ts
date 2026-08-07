import type {
  ShowmatchEventView,
  ShowmatchGameView,
  ShowmatchParticipantView,
  ShowmatchSeriesView,
  ShowmatchSide,
  ShowmatchTeamKey,
} from "./types";

export type ShowmatchHeroPreview = {
  heroName: string;
  heroImageUrl: string;
};

/** Résumé listable (page index) — une carte par série/lobby. */
export type ShowmatchSeriesSummary = {
  id: string;
  eventId: string;
  eventDate: string;
  eventTitle: string;
  scheduledAt: string;
  lobbyNumber: number;
  scoreTeam1: number;
  scoreTeam2: number;
  teamAName: string;
  teamBName: string;
  teamAKey: ShowmatchTeamKey;
  teamBKey: ShowmatchTeamKey;
  teamASide: ShowmatchSide | null;
  teamBSide: ShowmatchSide | null;
  teamAAvgRank: number;
  teamBAvgRank: number;
  teamAHeroes: ShowmatchHeroPreview[];
  teamBHeroes: ShowmatchHeroPreview[];
  winnerTeamKey: ShowmatchTeamKey | null;
  winnerName: string | null;
  mvpName: string | null;
  mvpHeroImageUrl: string | null;
  gameCount: number;
  streamUrls: string[];
  sideMappingAssumed: boolean;
  lastGameDurationSeconds: number | null;
  lastGameStartedAt: string | null;
  totalKills: number | null;
  totalSouls: number | null;
  eventStatus: ShowmatchEventView["status"];
};

/** @deprecated Prefer ShowmatchSeriesSummary */
export type ShowmatchMatchSummary = ShowmatchSeriesSummary;

function heroPreviews(
  players: ShowmatchParticipantView[],
): ShowmatchHeroPreview[] {
  return players.map((row) => ({
    heroName: row.heroName,
    heroImageUrl: row.heroImageUrl,
  }));
}

function pickPreviewGame(
  series: ShowmatchSeriesView,
): ShowmatchGameView | undefined {
  return (
    [...series.games]
      .reverse()
      .find((g) => g.teams.some((t) => t.players.length > 0)) ?? series.games[0]
  );
}

export function toSeriesSummary(
  event: ShowmatchEventView,
  series: ShowmatchSeriesView,
): ShowmatchSeriesSummary {
  const [teamA, teamB] = series.teams;
  const preview = pickPreviewGame(series);
  const mvpRow = preview?.teams
    .flatMap((t) => t.players)
    .find((row) => row.isMvp);

  let winnerTeamKey: ShowmatchTeamKey | null = null;
  let winnerName: string | null = null;
  if (series.scoreTeam1 > series.scoreTeam2) {
    winnerTeamKey = "team1";
    winnerName = teamA.teamKey === "team1" ? teamA.name : teamB.name;
  } else if (series.scoreTeam2 > series.scoreTeam1) {
    winnerTeamKey = "team2";
    winnerName = teamA.teamKey === "team2" ? teamA.name : teamB.name;
  }

  const playersForKey = (key: ShowmatchTeamKey) =>
    preview?.teams.find((t) => t.teamKey === key)?.players ?? [];

  const killValues = series.games
    .map((g) => g.totalKills)
    .filter((v): v is number => v != null);
  const soulValues = series.games
    .map((g) => g.totalSouls)
    .filter((v): v is number => v != null);
  const totalKills =
    killValues.length > 0 ? killValues.reduce((sum, v) => sum + v, 0) : null;
  const totalSouls =
    soulValues.length > 0 ? soulValues.reduce((sum, v) => sum + v, 0) : null;

  return {
    id: series.id,
    eventId: event.id,
    eventDate: event.eventDate,
    eventTitle: event.title,
    scheduledAt: event.scheduledAt,
    lobbyNumber: series.lobbyNumber,
    scoreTeam1: series.scoreTeam1,
    scoreTeam2: series.scoreTeam2,
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAKey: teamA.teamKey,
    teamBKey: teamB.teamKey,
    teamASide: teamA.side,
    teamBSide: teamB.side,
    teamAAvgRank: teamA.avgRank,
    teamBAvgRank: teamB.avgRank,
    teamAHeroes: heroPreviews(playersForKey(teamA.teamKey)),
    teamBHeroes: heroPreviews(playersForKey(teamB.teamKey)),
    winnerTeamKey,
    winnerName,
    mvpName: mvpRow?.player.displayName ?? preview?.mvp?.displayName ?? null,
    mvpHeroImageUrl: mvpRow?.heroImageUrl ?? null,
    gameCount: series.games.length,
    streamUrls: series.streamUrls,
    sideMappingAssumed: series.games.some(
      (g) => g.sideMappingSource === "assumed",
    ),
    lastGameDurationSeconds: preview?.durationSeconds ?? null,
    lastGameStartedAt: preview?.startedAt ?? null,
    totalKills,
    totalSouls,
    eventStatus: event.status,
  };
}

export function listSeriesSummaries(
  events: ShowmatchEventView[],
): ShowmatchSeriesSummary[] {
  return events
    .flatMap((event) =>
      event.series.map((series) => toSeriesSummary(event, series)),
    )
    .sort((a, b) => {
      const aTime = a.lastGameStartedAt ?? a.scheduledAt;
      const bTime = b.lastGameStartedAt ?? b.scheduledAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}

/** @deprecated Prefer listSeriesSummaries */
export function listMatchSummaries(
  events: ShowmatchEventView[],
): ShowmatchSeriesSummary[] {
  return listSeriesSummaries(events);
}

export function groupSummariesByEventDate(
  summaries: ShowmatchSeriesSummary[],
): Array<{
  eventDate: string;
  eventTitle: string;
  matches: ShowmatchSeriesSummary[];
}> {
  const groups = new Map<
    string,
    {
      eventDate: string;
      eventTitle: string;
      matches: ShowmatchSeriesSummary[];
    }
  >();

  for (const summary of summaries) {
    const existing = groups.get(summary.eventDate);
    if (existing) {
      existing.matches.push(summary);
      continue;
    }
    groups.set(summary.eventDate, {
      eventDate: summary.eventDate,
      eventTitle: summary.eventTitle,
      matches: [summary],
    });
  }

  return [...groups.values()].sort((a, b) =>
    b.eventDate.localeCompare(a.eventDate),
  );
}

export type ShowmatchDayOption = {
  eventDate: string;
  eventTitle: string;
  matchCount: number;
};

export function listShowmatchDays(
  summaries: ShowmatchSeriesSummary[],
): ShowmatchDayOption[] {
  return groupSummariesByEventDate(summaries).map((group) => ({
    eventDate: group.eventDate,
    eventTitle: group.eventTitle,
    matchCount: group.matches.length,
  }));
}

export function resolveShowmatchDayFilter(
  days: ShowmatchDayOption[],
  jourParam: string | undefined,
): string {
  if (jourParam === "tous") return "tous";
  if (jourParam && days.some((day) => day.eventDate === jourParam)) {
    return jourParam;
  }
  return days[0]?.eventDate ?? "tous";
}

export function filterSummariesByDay(
  summaries: ShowmatchSeriesSummary[],
  dayFilter: string,
): ShowmatchSeriesSummary[] {
  if (dayFilter === "tous") return summaries;
  return summaries.filter((summary) => summary.eventDate === dayFilter);
}

export function formatDayChipLabel(isoDate: string): {
  weekday: string;
  dayMonth: string;
} {
  const date = new Date(`${isoDate}T12:00:00+02:00`);
  return {
    weekday: new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      timeZone: "Europe/Paris",
    }).format(date),
    dayMonth: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Paris",
    }).format(date),
  };
}
