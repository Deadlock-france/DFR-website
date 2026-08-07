import type {
  ShowmatchEventView,
  ShowmatchGameView,
  ShowmatchParticipantView,
  ShowmatchPlayerRef,
  ShowmatchSeriesView,
  ShowmatchSide,
  ShowmatchTeamKey,
  ShowmatchTeamView,
} from "./types";

const HEROES: Record<
  number,
  { name: string; imageUrl: string }
> = {
  1: {
    name: "Infernus",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/inferno_card.webp",
  },
  2: {
    name: "Seven",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/gigawatt_card.webp",
  },
  3: {
    name: "Vindicta",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/hornet_card.webp",
  },
  4: {
    name: "Dame Geist",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/spectre_card.webp",
  },
  6: {
    name: "Abrams",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/bull_card.webp",
  },
  7: {
    name: "Scopa",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/wraith_card.webp",
  },
  8: {
    name: "McGinnis",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/engineer_card.webp",
  },
  10: {
    name: "Paradox",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/chrono_card.webp",
  },
  11: {
    name: "Dynamo",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/sumo_card.webp",
  },
  12: {
    name: "Kelvin",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/kelvin_card.webp",
  },
  13: {
    name: "Nébula",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/haze_card.webp",
  },
  14: {
    name: "Holliday",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/astro_card.webp",
  },
  15: {
    name: "Bebop",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/bebop_card.webp",
  },
  16: {
    name: "Calico",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/nano_card.webp",
  },
  17: {
    name: "Serregrise",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/archer_card.webp",
  },
  18: {
    name: "Miro et Minus",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/digger_card.webp",
  },
  19: {
    name: "Surin",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/shiv_card.webp",
  },
  20: {
    name: "Lyanne",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/tengu_card.webp",
  },
  25: {
    name: "Marshal",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/warden_card.webp",
  },
  27: {
    name: "Yamato",
    imageUrl:
      "https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/yamato_card.webp",
  },
};



function player(
  discordId: string,
  displayName: string,
): ShowmatchPlayerRef {
  return {
    id: `player_${discordId}`,
    discordId,
    steamId32: null,
    displayName,
    discordUsername: displayName,
    avatarUrl: null,
  };
}

function participant(
  pl: ShowmatchPlayerRef,
  heroId: number,
  stats: {
    netWorth: number;
    damage: number;
    healing: number;
    kills?: number;
    deaths?: number;
    assists?: number;
    isMvp?: boolean;
  },
): ShowmatchParticipantView {
  const hero = HEROES[heroId];
  if (!hero) {
    throw new Error(`Unknown mock hero id: ${heroId}`);
  }

  const kills =
    stats.kills ?? Math.max(1, Math.round(2 + stats.damage / 3_500));
  const deaths =
    stats.deaths ??
    Math.max(0, Math.round(1 + (52_000 - Math.min(stats.netWorth, 52_000)) / 7_000));
  const assists =
    stats.assists ??
    Math.max(0, Math.round(3 + stats.healing / 1_800 + stats.damage / 7_000));

  return {
    player: pl,
    teamKey: "team1",
    side: null,
    heroId,
    heroName: hero.name,
    heroImageUrl: hero.imageUrl,
    netWorth: stats.netWorth,
    damage: stats.damage,
    healing: stats.healing,
    kills,
    deaths,
    assists,
    isMvp: stats.isMvp ?? false,
  };
}

function team(
  id: string,
  name: string,
  teamKey: ShowmatchTeamKey,
  side: ShowmatchSide | null,
  avgRank: number,
  isWinner: boolean,
  captain: ShowmatchPlayerRef,
  players: ShowmatchParticipantView[],
): ShowmatchTeamView {
  const mapped = players.map((row) => ({ ...row, teamKey, side }));
  return {
    id,
    name,
    teamKey,
    side,
    avgRank,
    isWinner,
    captain,
    players: mapped,
    roster: mapped.map((row) => row.player),
  };
}

function game(input: {
  id: string;
  gameNumber: number;
  deadlockMatchId: string | null;
  startedAt: string | null;
  durationSeconds: number | null;
  totalKills: number;
  totalSouls: number;
  mvp: ShowmatchPlayerRef | null;
  teams: [ShowmatchTeamView, ShowmatchTeamView];
  sideMappingSource?: ShowmatchGameView["sideMappingSource"];
  mvpRule?: string | null;
}): ShowmatchGameView {
  return {
    ...input,
    sideMappingSource: input.sideMappingSource ?? "known",
    mvpRule: input.mvpRule ?? "highest_net_worth",
  };
}

function seriesRoster(
  teams: [ShowmatchTeamView, ShowmatchTeamView],
  scoreTeam1: number,
  scoreTeam2: number,
): [ShowmatchTeamView, ShowmatchTeamView] {
  return [
    {
      ...teams[0],
      players: [],
      roster: teams[0].roster,
      isWinner: scoreTeam1 > scoreTeam2,
    },
    {
      ...teams[1],
      players: [],
      roster: teams[1].roster,
      isWinner: scoreTeam2 > scoreTeam1,
    },
  ];
}

function series(input: {
  id: string;
  externalId: string;
  lobbyNumber: number;
  casterDiscordId: string | null;
  streamUrls: string[];
  scoreTeam1: number;
  scoreTeam2: number;
  games: ShowmatchGameView[];
}): ShowmatchSeriesView {
  const preview = input.games[0]?.teams;
  if (!preview) {
    throw new Error(`Series ${input.id} requires at least one game`);
  }
  return {
    ...input,
    teams: seriesRoster(preview, input.scoreTeam1, input.scoreTeam2),
  };
}


const p = {
  noir: player("310001", "Noir"),
  lys: player("310002", "Lys"),
  kael: player("310003", "Kael"),
  mira: player("310004", "Mira"),
  orion: player("310005", "Orion"),
  sage: player("310006", "Sage"),
  raven: player("310007", "Raven"),
  ivy: player("310008", "Ivy"),
  jett: player("310009", "Jett"),
  luna: player("310010", "Luna"),
  ash: player("310011", "Ash"),
  vex: player("310012", "Vex"),
  echo: player("310013", "Echo"),
  nyx: player("310014", "Nyx"),
  bolt: player("310015", "Bolt"),
  reed: player("310016", "Reed"),
  sol: player("310017", "Sol"),
  frost: player("310018", "Frost"),
  pix: player("310019", "Pix"),
  dawn: player("310020", "Dawn"),
  hex: player("310021", "Hex"),
  rue: player("310022", "Rue"),
  kilo: player("310023", "Kilo"),
  jade: player("310024", "Jade"),
  nova: player("310025", "Nova"),
  drift: player("310026", "Drift"),
  ember: player("310027", "Ember"),
  silk: player("310028", "Silk"),
  axiom: player("310029", "Axiom"),
  moss: player("310030", "Moss"),
  blaze: player("310031", "Blaze"),
  quay: player("310032", "Quay"),
  rind: player("310033", "Rind"),
  wisp: player("310034", "Wisp"),
  flint: player("310035", "Flint"),
  cove: player("310036", "Cove"),
  ark: player("310037", "Ark"),
  veil: player("310038", "Veil"),
  crest: player("310039", "Crest"),
  dune: player("310040", "Dune"),
  glen: player("310041", "Glen"),
  harp: player("310042", "Harp"),
  iris: player("310043", "Iris"),
  jolt: player("310044", "Jolt"),
  knox: player("310045", "Knox"),
  loom: player("310046", "Loom"),
  mink: player("310047", "Mink"),
  nash: player("310048", "Nash"),
} as const;


const gameLobby1 = game({
  id: "sm_mock_1_g1",
  gameNumber: 1,
  deadlockMatchId: "mock_dl_90001",
  startedAt: "2026-07-30T20:05:00+02:00",
  durationSeconds: 38 * 60 + 12,
  totalKills: 94,
  totalSouls: 268_400,
  mvp: p.noir,
  teams: [
    team("team_mock_1a", "Les Braises", "team1", "amber", 14.2, true, p.noir, [
      participant(p.noir, 1, { netWorth: 48_200, damage: 41_800, healing: 1_400, isMvp: true }),
      participant(p.lys, 13, { netWorth: 44_100, damage: 39_200, healing: 900 }),
      participant(p.kael, 6, { netWorth: 41_500, damage: 28_400, healing: 2_100 }),
      participant(p.mira, 11, { netWorth: 39_800, damage: 18_600, healing: 12_400 }),
      participant(p.orion, 17, { netWorth: 38_200, damage: 33_100, healing: 1_100 }),
      participant(p.sage, 12, { netWorth: 36_900, damage: 14_200, healing: 9_800 }),
    ]),
    team("team_mock_1b", "Courant Froid", "team2", "sapphire", 13.6, false, p.raven, [
      participant(p.raven, 7, { netWorth: 45_600, damage: 37_900, healing: 1_200 }),
      participant(p.ivy, 3, { netWorth: 42_300, damage: 35_400, healing: 800 }),
      participant(p.jett, 19, { netWorth: 40_100, damage: 31_200, healing: 1_600 }),
      participant(p.luna, 4, { netWorth: 38_700, damage: 22_800, healing: 8_900 }),
      participant(p.ash, 15, { netWorth: 37_400, damage: 26_500, healing: 2_400 }),
      participant(p.vex, 10, { netWorth: 35_800, damage: 19_300, healing: 3_200 }),
    ]),
  ],
});

const gameLobby1b = game({
  id: "sm_mock_1_g2",
  gameNumber: 2,
  deadlockMatchId: "mock_dl_90001b",
  startedAt: "2026-07-30T21:00:00+02:00",
  durationSeconds: 35 * 60 + 40,
  totalKills: 88,
  totalSouls: 251_200,
  mvp: p.lys,
  teams: [
    team("team_mock_1a_g2", "Les Braises", "team1", "amber", 14.2, true, p.noir, [
      participant(p.noir, 1, { netWorth: 44_100, damage: 36_200, healing: 1_200 }),
      participant(p.lys, 13, { netWorth: 49_800, damage: 42_500, healing: 1_100, isMvp: true }),
      participant(p.kael, 6, { netWorth: 40_200, damage: 27_100, healing: 1_900 }),
      participant(p.mira, 11, { netWorth: 38_500, damage: 17_400, healing: 11_200 }),
      participant(p.orion, 17, { netWorth: 37_100, damage: 30_800, healing: 900 }),
      participant(p.sage, 12, { netWorth: 35_400, damage: 13_100, healing: 8_700 }),
    ]),
    team("team_mock_1b_g2", "Courant Froid", "team2", "sapphire", 13.6, false, p.raven, [
      participant(p.raven, 7, { netWorth: 43_200, damage: 35_100, healing: 1_000 }),
      participant(p.ivy, 3, { netWorth: 40_800, damage: 33_200, healing: 700 }),
      participant(p.jett, 19, { netWorth: 38_900, damage: 28_400, healing: 1_400 }),
      participant(p.luna, 4, { netWorth: 37_200, damage: 20_100, healing: 7_800 }),
      participant(p.ash, 15, { netWorth: 35_900, damage: 24_300, healing: 2_100 }),
      participant(p.vex, 10, { netWorth: 34_100, damage: 17_800, healing: 2_900 }),
    ]),
  ],
});

const seriesLobby1 = series({
  id: "sm_mock_series_1",
  externalId: "sm_mock_lobby_1",
  lobbyNumber: 1,
  casterDiscordId: "3001",
  streamUrls: ["https://twitch.tv/deadlockfrance"],
  scoreTeam1: 2,
  scoreTeam2: 0,
  games: [gameLobby1, gameLobby1b],
});

const gameLobby2 = game({
  id: "sm_mock_2_g1",
  gameNumber: 1,
  deadlockMatchId: "mock_dl_90002",
  startedAt: "2026-07-30T20:12:00+02:00",
  durationSeconds: 42 * 60 + 45,
  totalKills: 108,
  totalSouls: 291_200,
  mvp: p.echo,
  teams: [
    team("team_mock_2a", "Nébuleuse", "team1", "amber", 11.8, false, p.nyx, [
      participant(p.nyx, 2, { netWorth: 43_200, damage: 36_100, healing: 1_000 }),
      participant(p.bolt, 14, { netWorth: 41_000, damage: 29_800, healing: 1_500 }),
      participant(p.reed, 8, { netWorth: 39_400, damage: 21_200, healing: 4_600 }),
      participant(p.sol, 27, { netWorth: 38_100, damage: 34_500, healing: 900 }),
      participant(p.frost, 18, { netWorth: 36_700, damage: 17_800, healing: 7_200 }),
      participant(p.pix, 16, { netWorth: 35_200, damage: 24_600, healing: 2_800 }),
    ]),
    team("team_mock_2b", "Éclat Noir", "team2", "sapphire", 12.1, true, p.echo, [
      participant(p.echo, 13, { netWorth: 51_400, damage: 46_200, healing: 1_100, isMvp: true }),
      participant(p.dawn, 1, { netWorth: 46_800, damage: 40_300, healing: 1_300 }),
      participant(p.hex, 6, { netWorth: 43_500, damage: 30_100, healing: 2_500 }),
      participant(p.rue, 11, { netWorth: 41_200, damage: 16_900, healing: 14_800 }),
      participant(p.kilo, 25, { netWorth: 39_600, damage: 27_400, healing: 1_800 }),
      participant(p.jade, 12, { netWorth: 37_900, damage: 12_700, healing: 10_200 }),
    ]),
  ],
});

const seriesLobby2 = series({
  id: "sm_mock_series_2",
  externalId: "sm_mock_lobby_2",
  lobbyNumber: 2,
  casterDiscordId: "3002",
  streamUrls: ["https://twitch.tv/example2"],
  scoreTeam1: 0,
  scoreTeam2: 1,
  games: [gameLobby2],
});

const gameLobby3 = game({
  id: "sm_mock_3_g1",
  gameNumber: 1,
  deadlockMatchId: "mock_dl_90003",
  startedAt: "2026-07-30T20:18:00+02:00",
  durationSeconds: 29 * 60 + 5,
  totalKills: 71,
  totalSouls: 214_900,
  mvp: p.ember,
  teams: [
    team("team_mock_3a", "Roche Rouge", "team1", "amber", 13.4, true, p.ember, [
      participant(p.ember, 1, { netWorth: 46_800, damage: 40_100, healing: 1_300, isMvp: true }),
      participant(p.silk, 13, { netWorth: 42_500, damage: 36_700, healing: 800 }),
      participant(p.axiom, 6, { netWorth: 39_900, damage: 25_400, healing: 2_200 }),
      participant(p.moss, 11, { netWorth: 37_600, damage: 15_800, healing: 11_100 }),
      participant(p.blaze, 17, { netWorth: 36_200, damage: 29_300, healing: 1_000 }),
      participant(p.quay, 12, { netWorth: 34_800, damage: 12_400, healing: 8_600 }),
    ]),
    team("team_mock_3b", "Brume Bleue", "team2", "sapphire", 12.9, false, p.rind, [
      participant(p.rind, 7, { netWorth: 41_200, damage: 33_800, healing: 1_100 }),
      participant(p.wisp, 3, { netWorth: 39_100, damage: 31_500, healing: 700 }),
      participant(p.flint, 19, { netWorth: 37_400, damage: 28_200, healing: 1_500 }),
      participant(p.cove, 4, { netWorth: 35_800, damage: 19_600, healing: 7_400 }),
      participant(p.ark, 15, { netWorth: 34_200, damage: 22_900, healing: 2_000 }),
      participant(p.veil, 10, { netWorth: 32_900, damage: 16_700, healing: 2_800 }),
    ]),
  ],
});

const seriesLobby3 = series({
  id: "sm_mock_series_3",
  externalId: "sm_mock_lobby_3",
  lobbyNumber: 3,
  casterDiscordId: null,
  streamUrls: [],
  scoreTeam1: 1,
  scoreTeam2: 0,
  games: [gameLobby3],
});

const gameFriday1 = game({
  id: "sm_mock_4_g1",
  gameNumber: 1,
  deadlockMatchId: "mock_dl_90004",
  startedAt: "2026-07-31T20:10:00+02:00",
  durationSeconds: 40 * 60 + 20,
  totalKills: 99,
  totalSouls: 275_100,
  mvp: p.crest,
  teams: [
    team("team_mock_4a", "Aube Écarlate", "team1", "amber", 13.1, true, p.crest, [
      participant(p.crest, 13, { netWorth: 50_100, damage: 44_200, healing: 1_200, isMvp: true }),
      participant(p.dune, 1, { netWorth: 45_300, damage: 38_900, healing: 1_400 }),
      participant(p.glen, 6, { netWorth: 42_700, damage: 29_500, healing: 2_300 }),
      participant(p.harp, 11, { netWorth: 40_200, damage: 17_100, healing: 13_200 }),
      participant(p.iris, 25, { netWorth: 38_800, damage: 26_800, healing: 1_600 }),
      participant(p.jolt, 12, { netWorth: 36_900, damage: 13_400, healing: 9_100 }),
    ]),
    team("team_mock_4b", "Marée Noire", "team2", "sapphire", 12.7, false, p.knox, [
      participant(p.knox, 7, { netWorth: 44_500, damage: 36_800, healing: 1_100 }),
      participant(p.loom, 3, { netWorth: 41_900, damage: 34_200, healing: 900 }),
      participant(p.mink, 19, { netWorth: 39_600, damage: 30_100, healing: 1_700 }),
      participant(p.nash, 4, { netWorth: 37_800, damage: 21_400, healing: 8_200 }),
      participant(p.nova, 15, { netWorth: 36_100, damage: 25_700, healing: 2_200 }),
      participant(p.drift, 10, { netWorth: 34_500, damage: 18_900, healing: 3_000 }),
    ]),
  ],
});

const seriesFriday1 = series({
  id: "sm_mock_series_4",
  externalId: "sm_mock_lobby_fri_1",
  lobbyNumber: 1,
  casterDiscordId: "3001",
  streamUrls: ["https://twitch.tv/deadlockfrance"],
  scoreTeam1: 1,
  scoreTeam2: 0,
  games: [gameFriday1],
});

export const MOCK_SHOWMATCH_EVENT: ShowmatchEventView = {
  id: "event_mock_2026_07_30",
  externalId: "sm_mock_thu",
  eventDate: "2026-07-30",
  title: "Showmatch du jeudi",
  scheduledAt: "2026-07-30T20:00:00+02:00",
  startedAt: "2026-07-30T20:05:00+02:00",
  completedAt: "2026-07-30T22:30:00+02:00",
  status: "completed",
  series: [seriesLobby1, seriesLobby2, seriesLobby3],
};

export const MOCK_SHOWMATCH_EVENT_FRIDAY: ShowmatchEventView = {
  id: "event_mock_2026_07_31",
  externalId: "sm_mock_fri",
  eventDate: "2026-07-31",
  title: "Showmatch du vendredi",
  scheduledAt: "2026-07-31T20:00:00+02:00",
  startedAt: "2026-07-31T20:10:00+02:00",
  completedAt: "2026-07-31T21:30:00+02:00",
  status: "completed",
  series: [seriesFriday1],
};

export const MOCK_SHOWMATCH_EVENTS: ShowmatchEventView[] = [
  MOCK_SHOWMATCH_EVENT_FRIDAY,
  MOCK_SHOWMATCH_EVENT,
];

export const MOCK_SHOWMATCH_SERIES: ShowmatchSeriesView[] =
  MOCK_SHOWMATCH_EVENTS.flatMap((event) => event.series);

export const MOCK_SHOWMATCH_GAMES: ShowmatchGameView[] =
  MOCK_SHOWMATCH_SERIES.flatMap((s) => s.games);
