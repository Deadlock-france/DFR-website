/** Types d’affichage showmatch (schéma Supabase v2.1). */

/** Côté Deadlock pour une game : amber (Ember) / sapphire. */
export type ShowmatchSide = "amber" | "sapphire";

/** Identité stable d’équipe sur toute la série. */
export type ShowmatchTeamKey = "team1" | "team2";

export type ShowmatchSideMappingSource = "known" | "assumed";

export type ShowmatchStatus =
  | "scheduled"
  | "teams_formed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ShowmatchPlayerRef = {
  id: string;
  displayName: string;
  discordUsername: string;
  avatarUrl: string | null;
  /** Présent seulement si `SHOWMATCH_PUBLIC_IDENTIFIERS.includeDiscordId`. */
  discordId?: string | null;
  /** Présent seulement si `SHOWMATCH_PUBLIC_IDENTIFIERS.includeSteamId32`. */
  steamId32?: string | null;
};

export type ShowmatchParticipantView = {
  player: ShowmatchPlayerRef;
  teamKey: ShowmatchTeamKey;
  side: ShowmatchSide | null;
  heroId: number;
  heroName: string;
  heroImageUrl: string;
  netWorth: number;
  damage: number;
  healing: number;
  kills: number;
  deaths: number;
  assists: number;
  /** true si plus haut net_worth de la game (règle MVP bot). */
  isMvp: boolean;
};

export type ShowmatchTeamView = {
  id: string;
  teamKey: ShowmatchTeamKey;
  name: string;
  /** Côté de cette game (null au niveau série). */
  side: ShowmatchSide | null;
  avgRank: number;
  isWinner: boolean;
  captain: ShowmatchPlayerRef;
  /** Stats de game (peut être vide si vainqueur sans API Deadlock). */
  players: ShowmatchParticipantView[];
  /** Roster série (connu dès teams_formed). */
  roster: ShowmatchPlayerRef[];
};

/** Une game Deadlock (1–3 par série). */
export type ShowmatchGameView = {
  id: string;
  gameNumber: number;
  deadlockMatchId: string | null;
  startedAt: string | null;
  durationSeconds: number | null;
  /** null = pas de stats API (vainqueur possible quand même). */
  totalKills: number | null;
  totalSouls: number | null;
  sideMappingSource: ShowmatchSideMappingSource | null;
  mvpRule: string | null;
  mvp: ShowmatchPlayerRef | null;
  teams: [ShowmatchTeamView, ShowmatchTeamView];
};

/** Lobby / série BO3. */
export type ShowmatchSeriesView = {
  id: string;
  externalId: string;
  lobbyNumber: number;
  /** Présent seulement si `SHOWMATCH_PUBLIC_IDENTIFIERS.includeCasterDiscordId`. */
  casterDiscordId?: string | null;
  streamUrls: string[];
  scoreTeam1: number;
  scoreTeam2: number;
  /** Roster série (sans side fixe) ; side rempli depuis la dernière game pour l’UI. */
  teams: [ShowmatchTeamView, ShowmatchTeamView];
  games: ShowmatchGameView[];
};

/** Événement / soirée showmatch. */
export type ShowmatchEventView = {
  id: string;
  externalId: string;
  eventDate: string;
  title: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  status: ShowmatchStatus;
  series: ShowmatchSeriesView[];
};

/** @deprecated Alias — préférer ShowmatchGameView. */
export type ShowmatchMatchView = ShowmatchGameView;
