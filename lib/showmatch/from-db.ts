import {
  SHOWMATCH_PUBLIC_IDENTIFIERS,
  publicPlayerEmbedColumns,
  toPublicShowmatchPlayerRef,
} from "@/lib/privacy/showmatch-publication";
import { createPublicClient } from "@/lib/supabase/public";
import {
  getShowmatchHeroMap,
  resolveShowmatchHero,
  type ShowmatchHeroMeta,
} from "./heroes";
import type {
  ShowmatchEventView,
  ShowmatchGameView,
  ShowmatchParticipantView,
  ShowmatchPlayerRef,
  ShowmatchSeriesView,
  ShowmatchSide,
  ShowmatchSideMappingSource,
  ShowmatchStatus,
  ShowmatchTeamKey,
  ShowmatchTeamView,
} from "./types";

type DbPlayer = {
  id: string;
  display_name: string;
  discord_username: string;
  avatar_url: string | null;
  discord_id?: string | null;
  steam_id32?: string | null;
};

type DbTeamMember = {
  player_id: string;
  player: DbPlayer | DbPlayer[] | null;
};

type DbTeam = {
  id: string;
  name: string;
  team_key: string;
  side: string | null;
  avg_rank: number | string | null;
  is_series_winner: boolean;
  captain_player_id: string | null;
  captain: DbPlayer | DbPlayer[] | null;
  showmatch_series_team_members: DbTeamMember[] | null;
};

type DbParticipant = {
  hero_id: number;
  net_worth: number;
  damage: number;
  healing: number;
  kills: number;
  deaths: number;
  assists: number;
  is_mvp: boolean;
  side: string | null;
  team_id: string;
  player_id: string;
  player: DbPlayer | DbPlayer[] | null;
};

type DbGame = {
  id: string;
  game_number: number;
  deadlock_match_id: string | null;
  started_at: string | null;
  duration_seconds: number | null;
  total_kills: number | null;
  total_souls: number | null;
  mvp_player_id: string | null;
  winner_team_id: string | null;
  side_mapping_source: string | null;
  mvp_rule: string | null;
  mvp: DbPlayer | DbPlayer[] | null;
  showmatch_game_participants: DbParticipant[] | null;
};

type DbSeries = {
  id: string;
  external_id: string;
  lobby_number: number;
  caster_discord_id?: string | null;
  stream_urls: string[] | null;
  score_team1: number;
  score_team2: number;
  showmatch_series_teams: DbTeam[] | null;
  showmatch_games: DbGame[] | null;
};

const PLAYER_EMBED = publicPlayerEmbedColumns().join(",\n        ");
const CASTER_EMBED = SHOWMATCH_PUBLIC_IDENTIFIERS.includeCasterDiscordId
  ? "    caster_discord_id,\n"
  : "";

type DbShowmatch = {
  id: string;
  external_id: string;
  title: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  showmatch_series: DbSeries[] | null;
};

const SHOWMATCH_SELECT = `
  id,
  external_id,
  title,
  scheduled_at,
  started_at,
  completed_at,
  status,
  showmatch_series (
    id,
    external_id,
    lobby_number,
${CASTER_EMBED}    stream_urls,
    score_team1,
    score_team2,
    showmatch_series_teams (
      id,
      name,
      team_key,
      side,
      avg_rank,
      is_series_winner,
      captain_player_id,
      captain:players!showmatch_series_teams_captain_player_id_fkey (
        ${PLAYER_EMBED}
      ),
      showmatch_series_team_members (
        player_id,
        player:players!showmatch_series_team_members_player_id_fkey (
          ${PLAYER_EMBED}
        )
      )
    ),
    showmatch_games (
      id,
      game_number,
      deadlock_match_id,
      started_at,
      duration_seconds,
      total_kills,
      total_souls,
      mvp_player_id,
      winner_team_id,
      side_mapping_source,
      mvp_rule,
      mvp:players!showmatch_games_mvp_player_id_fkey (
        ${PLAYER_EMBED}
      ),
      showmatch_game_participants (
        hero_id,
        net_worth,
        damage,
        healing,
        kills,
        deaths,
        assists,
        is_mvp,
        side,
        team_id,
        player_id,
        player:players!showmatch_game_participants_player_id_fkey (
          ${PLAYER_EMBED}
        )
      )
    )
  )
`;

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toPlayerRef(player: DbPlayer | null | undefined): ShowmatchPlayerRef {
  if (!player) {
    return toPublicShowmatchPlayerRef({
      id: "unknown",
      displayName: "Inconnu",
      discordUsername: "Inconnu",
      avatarUrl: null,
    });
  }
  return toPublicShowmatchPlayerRef({
    id: player.id,
    displayName: player.display_name,
    discordUsername: player.discord_username,
    avatarUrl: player.avatar_url,
    discordId: player.discord_id,
    steamId32: player.steam_id32,
  });
}

function teamRoster(team: DbTeam): ShowmatchPlayerRef[] {
  return (team.showmatch_series_team_members ?? [])
    .map((member) => toPlayerRef(asOne(member.player)))
    .filter((player) => player.id !== "unknown")
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
}

function isSide(value: string | null | undefined): value is ShowmatchSide {
  return value === "amber" || value === "sapphire";
}

function isTeamKey(value: string): value is ShowmatchTeamKey {
  return value === "team1" || value === "team2";
}

function isStatus(value: string): value is ShowmatchStatus {
  return (
    value === "scheduled" ||
    value === "teams_formed" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "cancelled"
  );
}

function isSideMappingSource(
  value: string | null,
): value is ShowmatchSideMappingSource {
  return value === "known" || value === "assumed";
}

function eventDateFromScheduled(scheduledAt: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(scheduledAt));
}

function mapParticipant(
  row: DbParticipant,
  teamKey: ShowmatchTeamKey,
  heroes: ReadonlyMap<number, ShowmatchHeroMeta>,
): ShowmatchParticipantView {
  const hero = resolveShowmatchHero(heroes, row.hero_id);
  return {
    player: toPlayerRef(asOne(row.player)),
    teamKey,
    side: isSide(row.side) ? row.side : null,
    heroId: row.hero_id,
    heroName: hero.name,
    heroImageUrl: hero.imageUrl,
    netWorth: row.net_worth,
    damage: row.damage,
    healing: row.healing,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    isMvp: row.is_mvp,
  };
}

function sideForTeam(
  participants: ShowmatchParticipantView[],
): ShowmatchSide | null {
  const sided = participants.find((p) => p.side != null);
  return sided?.side ?? null;
}

function mapTeamPair(
  teams: DbTeam[],
  participantsByTeam: Map<string, ShowmatchParticipantView[]>,
  winnerTeamId: string | null,
  useSeriesWinner: boolean,
): [ShowmatchTeamView, ShowmatchTeamView] | null {
  const team1 = teams.find((t) => t.team_key === "team1");
  const team2 = teams.find((t) => t.team_key === "team2");
  if (!team1 || !team2 || !isTeamKey(team1.team_key) || !isTeamKey(team2.team_key)) {
    return null;
  }

  const toView = (team: DbTeam): ShowmatchTeamView => {
    const players = participantsByTeam.get(team.id) ?? [];
    return {
      id: team.id,
      teamKey: team.team_key as ShowmatchTeamKey,
      name: team.name,
      side: sideForTeam(players) ?? (isSide(team.side) ? team.side : null),
      avgRank: Number(team.avg_rank ?? 0),
      isWinner: useSeriesWinner
        ? team.is_series_winner
        : winnerTeamId != null && team.id === winnerTeamId,
      captain: toPlayerRef(asOne(team.captain)),
      players,
      roster: teamRoster(team),
    };
  };

  return [toView(team1), toView(team2)];
}

function mapGame(
  game: DbGame,
  seriesTeams: DbTeam[],
  heroes: ReadonlyMap<number, ShowmatchHeroMeta>,
): ShowmatchGameView | null {
  const participants = game.showmatch_game_participants ?? [];
  const byTeam = new Map<string, ShowmatchParticipantView[]>();
  const teamKeyById = new Map(
    seriesTeams.map((t) => [t.id, t.team_key] as const),
  );

  for (const row of participants) {
    const key = teamKeyById.get(row.team_id);
    if (!key || !isTeamKey(key)) continue;
    const list = byTeam.get(row.team_id) ?? [];
    list.push(mapParticipant(row, key, heroes));
    byTeam.set(row.team_id, list);
  }

  for (const list of byTeam.values()) {
    list.sort((a, b) => b.netWorth - a.netWorth);
  }

  const teams = mapTeamPair(seriesTeams, byTeam, game.winner_team_id, false);
  if (!teams) return null;

  return {
    id: game.id,
    gameNumber: game.game_number,
    deadlockMatchId: game.deadlock_match_id,
    startedAt: game.started_at,
    durationSeconds: game.duration_seconds,
    totalKills: game.total_kills,
    totalSouls: game.total_souls,
    sideMappingSource: isSideMappingSource(game.side_mapping_source)
      ? game.side_mapping_source
      : null,
    mvpRule: game.mvp_rule,
    mvp: asOne(game.mvp) ? toPlayerRef(asOne(game.mvp)) : null,
    teams,
  };
}

function mapSeries(
  series: DbSeries,
  heroes: ReadonlyMap<number, ShowmatchHeroMeta>,
): ShowmatchSeriesView | null {
  const dbTeams = series.showmatch_series_teams ?? [];
  const games = [...(series.showmatch_games ?? [])]
    .sort((a, b) => a.game_number - b.game_number)
    .map((game) => mapGame(game, dbTeams, heroes))
    .filter((game): game is ShowmatchGameView => game != null);

  const previewSides = new Map<ShowmatchTeamKey, ShowmatchSide | null>();
  const last = games[games.length - 1];
  if (last) {
    for (const team of last.teams) {
      previewSides.set(team.teamKey, team.side);
    }
  }

  const roster = mapTeamPair(dbTeams, new Map(), null, true);
  if (!roster) return null;

  const withPreviewSides: [ShowmatchTeamView, ShowmatchTeamView] = [
    { ...roster[0], side: previewSides.get("team1") ?? roster[0].side },
    { ...roster[1], side: previewSides.get("team2") ?? roster[1].side },
  ];

  return {
    id: series.id,
    externalId: series.external_id,
    lobbyNumber: series.lobby_number,
    ...(SHOWMATCH_PUBLIC_IDENTIFIERS.includeCasterDiscordId
      ? { casterDiscordId: series.caster_discord_id ?? null }
      : {}),
    streamUrls: series.stream_urls ?? [],
    scoreTeam1: series.score_team1,
    scoreTeam2: series.score_team2,
    teams: withPreviewSides,
    games,
  };
}

function mapEvent(
  row: DbShowmatch,
  heroes: ReadonlyMap<number, ShowmatchHeroMeta>,
): ShowmatchEventView {
  const series = [...(row.showmatch_series ?? [])]
    .sort((a, b) => a.lobby_number - b.lobby_number)
    .map((s) => mapSeries(s, heroes))
    .filter((s): s is ShowmatchSeriesView => s != null);

  return {
    id: row.id,
    externalId: row.external_id,
    eventDate: eventDateFromScheduled(row.scheduled_at),
    title: row.title?.trim() || "Showmatch",
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: isStatus(row.status) ? row.status : "scheduled",
    series,
  };
}

/** Charge tous les showmatchs depuis Supabase (lecture anon RLS). */
export async function fetchShowmatchEventsFromDb(): Promise<ShowmatchEventView[]> {
  const supabase = createPublicClient();
  const heroes = await getShowmatchHeroMap();

  const { data, error } = await supabase
    .from("showmatches")
    .select(SHOWMATCH_SELECT)
    .order("scheduled_at", { ascending: false });

  if (error) {
    throw new Error(`showmatch fetch failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as DbShowmatch[]).map((row) =>
    mapEvent(row, heroes),
  );
}
