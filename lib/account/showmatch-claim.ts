import type { User } from "@supabase/supabase-js";

import {
  asDiscordSnowflake,
  resolveDiscordIdentity,
} from "@/lib/account/discord-profile-sync";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type IdentityData = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gi, "");
}

async function mergeShowmatchPlayers(
  fromId: string,
  toId: string,
): Promise<void> {
  if (fromId === toId) return;
  const sb = createServiceRoleClient();

  const { data: fromParts } = await sb
    .from("showmatch_game_participants")
    .select("id, game_id")
    .eq("player_id", fromId);

  for (const row of fromParts ?? []) {
    const { data: existing } = await sb
      .from("showmatch_game_participants")
      .select("id")
      .eq("game_id", row.game_id)
      .eq("player_id", toId)
      .maybeSingle();
    if (existing) {
      await sb.from("showmatch_game_participants").delete().eq("id", row.id);
    } else {
      await sb
        .from("showmatch_game_participants")
        .update({ player_id: toId })
        .eq("id", row.id);
    }
  }

  const { data: fromMembers } = await sb
    .from("showmatch_series_team_members")
    .select("id, team_id")
    .eq("player_id", fromId);

  for (const row of fromMembers ?? []) {
    const { data: existing } = await sb
      .from("showmatch_series_team_members")
      .select("id")
      .eq("team_id", row.team_id)
      .eq("player_id", toId)
      .maybeSingle();
    if (existing) {
      await sb.from("showmatch_series_team_members").delete().eq("id", row.id);
    } else {
      await sb
        .from("showmatch_series_team_members")
        .update({ player_id: toId })
        .eq("id", row.id);
    }
  }

  await sb
    .from("showmatch_games")
    .update({ mvp_player_id: toId })
    .eq("mvp_player_id", fromId);
  await sb
    .from("showmatch_series_teams")
    .update({ captain_player_id: toId })
    .eq("captain_player_id", fromId);

  const { data: fromPlayer } = await sb
    .from("players")
    .select("discord_username, display_name, avatar_url")
    .eq("id", fromId)
    .maybeSingle();
  const { data: toPlayer } = await sb
    .from("players")
    .select("discord_username, display_name, avatar_url")
    .eq("id", toId)
    .maybeSingle();

  if (fromPlayer && toPlayer) {
    // Le pseudo bot (historique) prime sur le handle Discord du compte.
    await sb
      .from("players")
      .update({
        display_name:
          fromPlayer.display_name &&
          fromPlayer.display_name !== "Joueur" &&
          fromPlayer.display_name !== "Caster"
            ? fromPlayer.display_name
            : toPlayer.display_name,
        discord_username:
          fromPlayer.discord_username &&
          fromPlayer.discord_username !== "Joueur" &&
          fromPlayer.discord_username !== "Caster"
            ? fromPlayer.discord_username
            : toPlayer.discord_username,
        avatar_url: toPlayer.avatar_url ?? fromPlayer.avatar_url,
      })
      .eq("id", toId);
  }

  await sb.from("players").delete().eq("id", fromId);
}

/**
 * Rattache le compte Discord au joueur showmatch (snowflake uniquement).
 * Utilise le service_role (serveur uniquement).
 */
export async function linkDiscordShowmatchPlayer(opts: {
  userId: string;
  providerId: string;
  identityData?: IdentityData;
}): Promise<string | null> {
  const providerId = asDiscordSnowflake(opts.providerId);
  if (!providerId) return null;

  const sb = createServiceRoleClient();
  const identityData = opts.identityData ?? {};

  const username =
    asString(identityData.preferred_username) ??
    asString(identityData.user_name) ??
    asString(identityData.full_name) ??
    asString(identityData.global_name) ??
    asString(identityData.name) ??
    "Joueur";
  const avatar =
    asString(identityData.avatar_url) ?? asString(identityData.picture);

  const { data: byId } = await sb
    .from("players")
    .select("id, auth_user_id, discord_username, display_name")
    .eq("discord_id", providerId)
    .maybeSingle();

  const { data: mine } = await sb
    .from("players")
    .select("id")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();

  if (byId) {
    if (byId.auth_user_id && byId.auth_user_id !== opts.userId) {
      throw new Error(`Discord account ${providerId} is already linked`);
    }

    const placeholder = (v: string | null) =>
      !v || v === "Joueur" || v === "Caster";
    await sb
      .from("players")
      .update({
        auth_user_id: opts.userId,
        claimed_at: new Date().toISOString(),
        discord_username: placeholder(byId.discord_username)
          ? username
          : byId.discord_username,
        display_name: placeholder(byId.display_name)
          ? username
          : byId.display_name,
        ...(avatar ? { avatar_url: avatar } : {}),
      })
      .eq("id", byId.id);

    if (mine?.id && mine.id !== byId.id) {
      await mergeShowmatchPlayers(mine.id, byId.id);
    }
    return byId.id;
  }

  if (mine?.id) {
    await sb
      .from("players")
      .update({
        discord_id: providerId,
        claimed_at: new Date().toISOString(),
        avatar_url: avatar,
      })
      .eq("id", mine.id);
    return mine.id;
  }

  const { data: inserted, error } = await sb
    .from("players")
    .insert({
      discord_id: providerId,
      auth_user_id: opts.userId,
      discord_username: username,
      display_name: username,
      avatar_url: avatar,
      claimed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return inserted.id;
}

/** Claim via auth.identities (jamais profiles.discord_id ni user_metadata). */
export async function claimShowmatchPlayerForUser(
  userId: string,
  user?: Pick<User, "identities"> | null,
): Promise<string | null> {
  const identity = await resolveDiscordIdentity(userId, user);
  if (!identity) return null;

  return linkDiscordShowmatchPlayer({
    userId,
    providerId: identity.providerId,
    identityData: identity.identityData,
  });
}

/**
 * Ancien claim first-come par pseudo bot — désactivé (IDOR).
 */
export async function claimShowmatchPlayerByNickname(
  _userId: string,
  _nicknameRaw: string,
): Promise<{ playerId: string; nickname: string }> {
  throw new Error("claim_disabled");
}

export type UnclaimedShowmatchName = {
  discordUsername: string;
  gamesCount: number;
};

/** Suggestions de pseudos bot non claimés (recherche). */
export async function searchUnclaimedShowmatchNicknames(
  queryRaw: string,
  limit = 8,
): Promise<UnclaimedShowmatchName[]> {
  const q = queryRaw.trim();
  if (q.length < 2) return [];

  const sb = createServiceRoleClient();
  const { data: unclaimed, error } = await sb
    .from("players")
    .select("id, discord_username")
    .is("claimed_at", null)
    .neq("discord_username", "?")
    .neq("discord_username", "Joueur")
    .ilike("discord_username", `%${q}%`)
    .limit(40);

  if (error) throw error;

  const needleNorm = normalizeName(q);
  const rows = (unclaimed ?? [])
    .filter((p) => {
      const name = (p.discord_username ?? "").trim();
      if (!name || name === "?") return false;
      return (
        name.toLowerCase().includes(q.toLowerCase()) ||
        (needleNorm.length > 0 && normalizeName(name).includes(needleNorm))
      );
    })
    .slice(0, limit);

  const results: UnclaimedShowmatchName[] = [];
  for (const row of rows) {
    const { count } = await sb
      .from("showmatch_game_participants")
      .select("id", { count: "exact", head: true })
      .eq("player_id", row.id);
    results.push({
      discordUsername: row.discord_username as string,
      gamesCount: count ?? 0,
    });
  }

  return results.sort((a, b) => b.gamesCount - a.gamesCount);
}
