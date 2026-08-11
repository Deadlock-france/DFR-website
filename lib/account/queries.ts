import { cache } from "react";

import { claimShowmatchPlayerForUser } from "@/lib/account/showmatch-claim";
import { createClient, createReadonlyClient } from "@/lib/supabase/server";
import type {
  InviteRole,
  PlayerSearchResult,
  Profile,
  ProfileHeroPref,
  ShowmatchHistoryEntry,
  ShowmatchPlayerRef,
  Team,
  TeamInviteWithTeam,
  TeamMemberRole,
  TeamMembership,
  TeamMessageWithAuthor,
  TeamWithMembers,
} from "@/lib/account/types";
import {
  normalizePlayerSearchQuery,
  normalizeTeamName,
  normalizeTeamTag,
} from "@/lib/account/types";
import type { DeadlockHero } from "@/lib/deadlock/types";
import { resolveShowmatchHero } from "@/lib/showmatch/heroes";

/** Une seule lecture JWT par requête RSC (layout dock + page). */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return String(data.claims.sub);
});

export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("unauthenticated");
  }
  return userId;
}

export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
});

/** Toutes les équipes du joueur avec son rôle (capitaine / membre / remplaçant). */
export const getMyTeams = cache(
  async (userId: string): Promise<TeamMembership[]> => {
    const supabase = await createReadonlyClient();
    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("profile_id", userId);

    if (membershipError) throw membershipError;
    if (!memberships?.length) return [];

    const roleByTeam = new Map(
      memberships.map((row) => [
        row.team_id as string,
        row.role as TeamMemberRole,
      ]),
    );
    const teamIds = [...roleByTeam.keys()];

    const { data: teams, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .in("id", teamIds)
      .order("created_at", { ascending: true });

    if (teamError) throw teamError;

    return ((teams ?? []) as Team[]).map((team) => ({
      ...team,
      role: roleByTeam.get(team.id) ?? "member",
    }));
  },
);

/** @deprecated Prefer getMyTeams — conservé pour transition douce. */
export const getMyTeam = cache(async (userId: string): Promise<Team | null> => {
  const teams = await getMyTeams(userId);
  return teams[0] ?? null;
});

export const getPendingInviteCount = cache(async (userId: string): Promise<number> => {
  const supabase = await createReadonlyClient();
  const { count, error } = await supabase
    .from("team_invites")
    .select("*", { count: "exact", head: true })
    .eq("invitee_id", userId)
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
});
export async function getTeamWithMembers(
  teamId: string,
): Promise<TeamWithMembers | null> {
  const supabase = await createReadonlyClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team) return null;

  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("team_id, profile_id, role, joined_at, profile:profiles(*)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  if (membersError) throw membersError;

  return {
    ...(team as Team),
    members: (members ?? []).map((row) => ({
      team_id: row.team_id as string,
      profile_id: row.profile_id as string,
      role: row.role as TeamMemberRole,
      joined_at: row.joined_at as string,
      profile: row.profile as unknown as Profile,
    })),
  };
}

export async function createTeam(input: {
  name: string;
  tag: string;
}): Promise<Team> {
  const name = normalizeTeamName(input.name);
  const tag = normalizeTeamTag(input.tag);

  if (!name || !tag) {
    throw new Error("invalid_input");
  }

  const supabase = await createReadonlyClient();
  const { data, error } = await supabase.rpc("create_team", {
    p_name: name,
    p_tag: tag,
  });

  if (error) throw error;
  return data as Team;
}

export async function updateDisplayName(
  userId: string,
  displayName: string | null,
): Promise<Profile> {
  const value = displayName?.trim() || null;
  if (value && value.length > 40) {
    throw new Error("invalid_display_name");
  }

  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: value })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function searchPlayers(input: {
  query: string;
  teamId?: string | null;
  limit?: number;
}): Promise<PlayerSearchResult[]> {
  const q = normalizePlayerSearchQuery(input.query);
  if (!q) return [];

  const supabase = await createReadonlyClient();
  const { data, error } = await supabase.rpc("search_players", {
    p_query: q,
    p_team_id: input.teamId ?? null,
    p_limit: input.limit ?? 20,
  });

  if (error) throw error;

  return ((data ?? []) as PlayerSearchResult[]).map((row) => ({
    ...row,
    team_tags: row.team_tags ?? [],
    hero_ids: row.hero_ids ?? [],
    score: Number(row.score ?? 0),
  }));
}

export async function inviteToTeam(input: {
  teamId: string;
  inviteeId: string;
  role?: InviteRole;
}): Promise<void> {
  const supabase = await createReadonlyClient();
  const { error } = await supabase.rpc("invite_to_team", {
    p_team_id: input.teamId,
    p_invitee_id: input.inviteeId,
    p_role: input.role ?? "member",
  });
  if (error) throw error;
}

export async function respondToTeamInvite(input: {
  inviteId: string;
  accept: boolean;
}): Promise<void> {
  const supabase = await createReadonlyClient();
  const { error } = await supabase.rpc("respond_to_team_invite", {
    p_invite_id: input.inviteId,
    p_accept: input.accept,
  });
  if (error) throw error;
}

export async function leaveTeam(teamId: string): Promise<void> {
  const supabase = await createReadonlyClient();
  const { error } = await supabase.rpc("leave_team", {
    p_team_id: teamId,
  });
  if (error) throw error;
}

export async function kickTeamMember(input: {
  teamId: string;
  profileId: string;
}): Promise<void> {
  const supabase = await createReadonlyClient();
  const { error } = await supabase.rpc("kick_team_member", {
    p_team_id: input.teamId,
    p_profile_id: input.profileId,
  });
  if (error) throw error;
}

export async function getPendingInvitesForUser(
  userId: string,
): Promise<TeamInviteWithTeam[]> {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("team_invites")
    .select("*, team:teams(id, name, tag)")
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const team = row.team as unknown as { id: string; name: string; tag: string };
    return {
      id: row.id as string,
      team_id: row.team_id as string,
      inviter_id: row.inviter_id as string,
      invitee_id: row.invitee_id as string,
      role: row.role as InviteRole,
      status: row.status as TeamInviteWithTeam["status"],
      created_at: row.created_at as string,
      team: { id: team.id, name: team.name, tag: team.tag },
    };
  });
}

export async function getHeroPrefs(
  userId: string,
): Promise<ProfileHeroPref[]> {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("profile_hero_prefs")
    .select("*")
    .eq("profile_id", userId)
    .order("priority", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ProfileHeroPref[];
}

export async function setHeroPrefs(
  userId: string,
  prefs: Array<{ priority: 1 | 2 | 3; heroId: number | null }>,
): Promise<void> {
  const supabase = await createReadonlyClient();

  const { error: deleteError } = await supabase
    .from("profile_hero_prefs")
    .delete()
    .eq("profile_id", userId);

  if (deleteError) throw deleteError;

  const rows = prefs
    .filter((p) => p.heroId != null)
    .map((p) => ({
      profile_id: userId,
      priority: p.priority,
      hero_id: p.heroId as number,
    }));

  if (rows.length === 0) return;

  const { error: insertError } = await supabase
    .from("profile_hero_prefs")
    .insert(rows);

  if (insertError) throw insertError;
}

export async function getTeamMessages(
  teamId: string,
  limit = 50,
): Promise<TeamMessageWithAuthor[]> {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("team_messages")
    .select(
      "id, team_id, author_id, body, created_at, author:profiles!author_id(id, display_name, global_name, username, avatar_url)",
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as TeamMessageWithAuthor[])
    .map((row) => row)
    .reverse();
}

/**
 * Claim automatique (RPC SQL si dispo, sinon service_role TS) puis
 * renvoie le player showmatch lié au compte.
 */
export async function claimAndGetShowmatchPlayer(
  userId: string,
): Promise<ShowmatchPlayerRef | null> {
  try {
    const authed = await createClient();
    const { error: rpcError } = await authed.rpc("claim_showmatch_player_for_me");
    if (rpcError) {
      await claimShowmatchPlayerForUser(userId);
    }
  } catch {
    try {
      await claimShowmatchPlayerForUser(userId);
    } catch (error) {
      console.error("claim showmatch player failed:", error);
    }
  }

  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, discord_username, display_name, claimed_at")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id as string,
    discordUsername: data.discord_username as string,
    displayName: data.display_name as string,
    claimedAt: (data.claimed_at as string | null) ?? null,
  };
}

export async function getShowmatchHistoryForPlayer(
  playerId: string,
  heroes: DeadlockHero[],
): Promise<ShowmatchHistoryEntry[]> {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("player_showmatch_stats")
    .select(
      "participant_id, player_id, game_id, series_id, showmatch_id, hero_id, net_worth, kills, deaths, assists, is_mvp, team_name, team_side, won, started_at, duration_seconds, game_number, lobby_number, scheduled_at, event_title",
    )
    .eq("player_id", playerId)
    .order("scheduled_at", { ascending: false });

  if (error) throw error;

  const heroMap = new Map(
    heroes.map((h) => [
      h.id,
      {
        name: h.name,
        imageUrl:
          h.images.icon_hero_card_webp ??
          h.images.icon_hero_card ??
          h.images.icon_image_small_webp ??
          h.images.icon_image_small ??
          "",
      },
    ]),
  );

  return (data ?? []).map((row) => {
    const hero = resolveShowmatchHero(heroMap, Number(row.hero_id));
    const side = row.team_side;
    return {
      participantId: row.participant_id as string,
      playerId: row.player_id as string,
      gameId: row.game_id as string,
      seriesId: row.series_id as string,
      showmatchId: row.showmatch_id as string,
      eventTitle: (row.event_title as string | null) ?? null,
      scheduledAt: (row.scheduled_at as string | null) ?? null,
      startedAt: (row.started_at as string | null) ?? null,
      lobbyNumber: (row.lobby_number as number | null) ?? null,
      gameNumber: Number(row.game_number ?? 1),
      teamName: (row.team_name as string) ?? "Équipe",
      teamSide:
        side === "amber" || side === "sapphire"
          ? side
          : null,
      won: typeof row.won === "boolean" ? row.won : null,
      heroId: Number(row.hero_id),
      heroName: hero.name,
      heroImageUrl: hero.imageUrl || null,
      kills: Number(row.kills ?? 0),
      deaths: Number(row.deaths ?? 0),
      assists: Number(row.assists ?? 0),
      netWorth: Number(row.net_worth ?? 0),
      isMvp: Boolean(row.is_mvp),
      durationSeconds:
        row.duration_seconds == null ? null : Number(row.duration_seconds),
    };
  });
}
