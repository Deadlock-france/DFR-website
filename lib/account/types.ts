export type TeamMemberRole = "captain" | "member" | "substitute";

export type InviteRole = "member" | "substitute";

export type InviteStatus = "pending" | "accepted" | "declined" | "cancelled";

export type Profile = {
  id: string;
  discord_id: string | null;
  username: string | null;
  global_name: string | null;
  display_name: string | null;
  /** Pseudo utilisé par le bot showmatch (ex. Mizara34), distinct du handle Discord. */
  showmatch_nickname?: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  tag: string;
  captain_id: string;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  team_id: string;
  profile_id: string;
  role: TeamMemberRole;
  joined_at: string;
};

export type TeamWithMembers = Team & {
  members: Array<TeamMember & { profile: Profile }>;
};

/** Équipe du joueur courant avec son rôle dans cette équipe. */
export type TeamMembership = Team & {
  role: TeamMemberRole;
};

export type TeamInvite = {
  id: string;
  team_id: string;
  inviter_id: string;
  invitee_id: string;
  role: InviteRole;
  status: InviteStatus;
  created_at: string;
};

export type TeamInviteWithTeam = TeamInvite & {
  team: Pick<Team, "id" | "name" | "tag">;
};

/** Payload du dock compte (API /api/account/me). */
export type AccountDockTeam = {
  id: string;
  name: string;
  tag: string;
  role: TeamMemberRole;
};

export type AccountDockFriend = {
  id: string;
  displayLabel: string;
  avatarUrl: string | null;
};

export type AccountDockUser = {
  id: string;
  displayLabel: string;
  avatarUrl: string | null;
  teams: AccountDockTeam[];
  friends: AccountDockFriend[];
  pendingInvites: TeamInviteWithTeam[];
};

export type ProfileHeroPref = {
  profile_id: string;
  priority: 1 | 2 | 3;
  hero_id: number;
};

/** Joueur showmatch lié au compte. */
export type ShowmatchPlayerRef = {
  id: string;
  discordUsername: string;
  displayName: string;
  claimedAt: string | null;
};

/** Une participation de game pour l’historique profil. */
export type ShowmatchHistoryEntry = {
  participantId: string;
  playerId: string;
  gameId: string;
  seriesId: string;
  showmatchId: string;
  eventTitle: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  lobbyNumber: number | null;
  gameNumber: number;
  teamName: string;
  teamSide: "amber" | "sapphire" | null;
  won: boolean | null;
  heroId: number;
  heroName: string | null;
  heroImageUrl: string | null;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  isMvp: boolean;
  durationSeconds: number | null;
};

export type PlayerSearchResult = {
  id: string;
  display_name: string | null;
  global_name: string | null;
  username: string | null;
  avatar_url: string | null;
  team_tags: string[];
  hero_ids: number[];
  score: number;
};

export type TeamMessage = {
  id: string;
  team_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type TeamMessageWithAuthor = TeamMessage & {
  author: Pick<Profile, "id" | "display_name" | "global_name" | "username" | "avatar_url">;
};

/** Affiche le meilleur libellé disponible pour un profil. */
export function profileDisplayName(
  profile: Pick<Profile, "display_name" | "global_name" | "username">,
): string {
  return (
    profile.display_name?.trim() ||
    profile.global_name?.trim() ||
    profile.username?.trim() ||
    "Joueur"
  );
}

export function playerSearchDisplayName(
  player: Pick<
    PlayerSearchResult,
    "display_name" | "global_name" | "username"
  >,
): string {
  return profileDisplayName(player);
}

/**
 * Valide un tag d'équipe (2–5 alphanumériques). Renvoie le tag normalisé
 * en majuscules, ou null si invalide.
 */
export function normalizeTeamTag(raw: string): string | null {
  const tag = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,5}$/.test(tag)) return null;
  return tag;
}

export function normalizeTeamName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 2 || name.length > 40) return null;
  return name;
}

/** Normalise une requête de recherche joueur (min 2 caractères). */
export function normalizePlayerSearchQuery(raw: string): string | null {
  const q = raw.trim().replace(/\s+/g, " ");
  if (q.length < 2 || q.length > 64) return null;
  return q;
}

export function teamRoleLabel(role: TeamMemberRole | InviteRole): string {
  switch (role) {
    case "captain":
      return "Capitaine";
    case "substitute":
      return "Remplaçant";
    default:
      return "Membre";
  }
}
