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

async function loadProfileNames(userId: string): Promise<{
  username: string | null;
  global_name: string | null;
  display_name: string | null;
  showmatch_nickname: string | null;
  avatar_url?: string | null;
  discord_id?: string | null;
} | null> {
  const sb = createServiceRoleClient();
  const full = await sb
    .from("profiles")
    .select(
      "discord_id, username, global_name, display_name, showmatch_nickname, avatar_url",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!full.error) {
    return full.data as {
      username: string | null;
      global_name: string | null;
      display_name: string | null;
      showmatch_nickname: string | null;
      avatar_url?: string | null;
      discord_id?: string | null;
    } | null;
  }

  // Migration showmatch_nickname pas encore appliquée.
  if (/showmatch_nickname|column .* does not exist/i.test(full.error.message)) {
    const fallback = await sb
      .from("profiles")
      .select("discord_id, username, global_name, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (fallback.error) throw fallback.error;
    return fallback.data
      ? { ...fallback.data, showmatch_nickname: null }
      : null;
  }

  throw full.error;
}

function collectNameCandidates(
  identityData: IdentityData,
  profile: {
    username: string | null;
    global_name: string | null;
    display_name: string | null;
    showmatch_nickname?: string | null;
  } | null,
): string[] {
  const raw = [
    asString(identityData.full_name),
    asString(identityData.global_name),
    asString(identityData.name),
    asString(identityData.preferred_username),
    asString(identityData.user_name),
    asString(identityData.showmatch_nickname),
    profile?.username ?? null,
    profile?.global_name ?? null,
    profile?.display_name ?? null,
    profile?.showmatch_nickname ?? null,
  ];
  return [
    ...new Set(
      raw
        .filter((v): v is string => Boolean(v))
        .flatMap((v) => {
          const lower = v.toLowerCase();
          const normalized = normalizeName(v);
          return normalized ? [lower, normalized] : [lower];
        }),
    ),
  ];
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
 * Rattache le compte Discord au joueur showmatch (snowflake, sinon pseudo unique).
 * Utilise le service_role (serveur uniquement).
 */
export async function linkDiscordShowmatchPlayer(opts: {
  userId: string;
  providerId: string;
  identityData?: IdentityData;
}): Promise<string | null> {
  const providerId = opts.providerId.trim();
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

  const profile = await loadProfileNames(opts.userId);
  const names = collectNameCandidates(identityData, profile);

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

  let byNameId: string | null = null;
  if (names.length > 0) {
    const { data: unclaimed } = await sb
      .from("players")
      .select("id, discord_username")
      .is("claimed_at", null);

    const matches = (unclaimed ?? []).filter((p) => {
      const username = (p.discord_username ?? "").trim();
      if (!username) return false;
      const lower = username.toLowerCase();
      const normalized = normalizeName(username);
      return names.includes(lower) || (normalized.length > 0 && names.includes(normalized));
    });
    if (matches.length === 1) {
      byNameId = matches[0].id;
    }
  }

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

    if (byNameId && byNameId !== byId.id) {
      await mergeShowmatchPlayers(byNameId, byId.id);
    }
    if (mine?.id && mine.id !== byId.id && mine.id !== byNameId) {
      await mergeShowmatchPlayers(mine.id, byId.id);
    }
    return byId.id;
  }

  if (mine?.id) {
    if (byNameId && byNameId !== mine.id) {
      await mergeShowmatchPlayers(byNameId, mine.id);
    }
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

  if (byNameId) {
    await sb
      .from("players")
      .update({
        discord_id: providerId,
        auth_user_id: opts.userId,
        claimed_at: new Date().toISOString(),
        avatar_url: avatar,
      })
      .eq("id", byNameId);
    return byNameId;
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

/** Claim pour l’utilisateur courant (identity Discord via profiles.discord_id). */
export async function claimShowmatchPlayerForUser(
  userId: string,
): Promise<string | null> {
  const profile = await loadProfileNames(userId);

  if (!profile?.discord_id) {
    return null;
  }

  return linkDiscordShowmatchPlayer({
    userId,
    providerId: profile.discord_id,
    identityData: {
      preferred_username: profile.username,
      user_name: profile.username,
      global_name: profile.global_name,
      full_name: profile.global_name ?? profile.display_name,
      name: profile.display_name ?? profile.global_name ?? profile.username,
      showmatch_nickname: profile.showmatch_nickname,
      avatar_url: profile.avatar_url,
    },
  });
}

/**
 * Rattache l’historique via le pseudo bot showmatch (ex. Mizara34),
 * distinct du handle Discord (ex. kaliqot).
 */
export async function claimShowmatchPlayerByNickname(
  userId: string,
  nicknameRaw: string,
): Promise<{ playerId: string; nickname: string }> {
  const nickname = nicknameRaw.trim();
  if (nickname.length < 2 || nickname.length > 64) {
    throw new Error("invalid_nickname");
  }

  const sb = createServiceRoleClient();
  const profile = await loadProfileNames(userId);

  if (!profile?.discord_id) {
    throw new Error("missing_discord");
  }

  // Colonne optionnelle tant que la migration n’est pas appliquée.
  const { error: saveError } = await sb
    .from("profiles")
    .update({ showmatch_nickname: nickname })
    .eq("id", userId);
  if (
    saveError &&
    !/showmatch_nickname|column .* does not exist/i.test(saveError.message)
  ) {
    throw saveError;
  }

  const { data: unclaimed, error: listError } = await sb
    .from("players")
    .select("id, discord_username")
    .is("claimed_at", null);
  if (listError) throw listError;

  const needle = nickname.toLowerCase();
  const needleNorm = normalizeName(nickname);

  const exact = (unclaimed ?? []).filter(
    (p) => (p.discord_username ?? "").trim().toLowerCase() === needle,
  );
  const normalized = (unclaimed ?? []).filter((p) => {
    const u = (p.discord_username ?? "").trim();
    return u.length > 0 && normalizeName(u) === needleNorm;
  });

  let matchId: string;
  if (exact.length === 1) {
    matchId = exact[0].id;
  } else if (exact.length > 1) {
    throw new Error("ambiguous_nickname");
  } else if (normalized.length === 1) {
    matchId = normalized[0].id;
  } else if (normalized.length > 1) {
    throw new Error("ambiguous_nickname");
  } else {
    throw new Error("nickname_not_found");
  }

  const playerId = await linkDiscordShowmatchPlayer({
    userId,
    providerId: profile.discord_id,
    identityData: {
      preferred_username: profile.username,
      user_name: profile.username,
      global_name: profile.global_name,
      full_name: profile.global_name ?? profile.display_name,
      name: nickname,
      showmatch_nickname: nickname,
      avatar_url: profile.avatar_url,
    },
  });

  if (!playerId) {
    throw new Error("claim_failed");
  }

  // Si le matching par noms était ambigu, force le merge du joueur historique.
  const { data: stillUnmerged } = await sb
    .from("players")
    .select("id, auth_user_id")
    .eq("id", matchId)
    .maybeSingle();

  if (stillUnmerged && stillUnmerged.id !== playerId) {
    if (
      stillUnmerged.auth_user_id &&
      stillUnmerged.auth_user_id !== userId
    ) {
      throw new Error("nickname_already_claimed");
    }
    await mergeShowmatchPlayers(matchId, playerId);
  }

  return { playerId, nickname };
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
