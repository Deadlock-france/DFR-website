import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { toPlayerRankSnapshot } from "@/lib/account/player-rank";
import { getCurrentUserId } from "@/lib/account/queries";
import {
  earnedShowmatchBadges,
  tallyShowmatchBadgeStats,
} from "@/lib/account/showmatch-badges";
import type {
  Profile,
  ProfileHeroPref,
  ShowmatchHistoryEntry,
  ShowmatchPlayerRef,
} from "@/lib/account/types";
import { profileDisplayName } from "@/lib/account/types";
import { toSteamAccountId } from "@/lib/deadlock/steam-id";
import {
  getShowmatchHeroMap,
  resolveShowmatchHero,
} from "@/lib/showmatch/heroes";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createReadonlyClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const supabase = await createReadonlyClient();
    const admin = createServiceRoleClient();

    const [profileRes, prefsRes, playerRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("profile_hero_prefs")
        .select("*")
        .eq("profile_id", userId)
        .order("priority", { ascending: true }),
      admin
        .from("players")
        .select(
          "id, discord_username, display_name, claimed_at, steam_id32, ranked_badge, ranked_fetched_at",
        )
        .eq("auth_user_id", userId)
        .maybeSingle(),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (prefsRes.error) throw prefsRes.error;
    if (playerRes.error) throw playerRes.error;

    const profile = profileRes.data as Profile | null;
    if (!profile) {
      return NextResponse.json({ user: { id: userId, profile: null } });
    }

    const prefs = (prefsRes.data ?? []) as ProfileHeroPref[];
    const playerRow = playerRes.data;
    const showmatchPlayer: ShowmatchPlayerRef | null = playerRow
      ? {
          id: playerRow.id as string,
          discordUsername: playerRow.discord_username as string,
          displayName: playerRow.display_name as string,
          claimedAt: (playerRow.claimed_at as string | null) ?? null,
        }
      : null;

    const rank = toPlayerRankSnapshot({
      hasSteam: toSteamAccountId(playerRow?.steam_id32 as string | null) != null,
      badge: (playerRow?.ranked_badge as number | null) ?? null,
      fetchedAt: (playerRow?.ranked_fetched_at as string | null) ?? null,
    });

    const [statsRes, badgeStatsRes, heroMap] = await Promise.all([
      showmatchPlayer
        ? supabase
            .from("player_showmatch_stats")
            .select(
              "participant_id, player_id, game_id, series_id, showmatch_id, hero_id, net_worth, kills, deaths, assists, is_mvp, team_name, team_side, won, started_at, duration_seconds, game_number, lobby_number, scheduled_at, event_title",
            )
            .eq("player_id", showmatchPlayer.id)
            .order("scheduled_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
      showmatchPlayer
        ? supabase
            .from("player_showmatch_stats")
            .select("won, is_mvp")
            .eq("player_id", showmatchPlayer.id)
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
      getShowmatchHeroMap(),
    ]);

    if (statsRes.error) throw statsRes.error;
    if (badgeStatsRes.error) throw badgeStatsRes.error;

    const showmatchBadges = earnedShowmatchBadges(
      tallyShowmatchBadgeStats(
        (badgeStatsRes.data ?? []) as Array<{
          won?: boolean | null;
          is_mvp?: boolean | null;
        }>,
      ),
    );

    const showmatchHistory: ShowmatchHistoryEntry[] = (statsRes.data ?? []).map(
      (row) => {
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
          gameNumber: Number(row.game_number),
          teamName: (row.team_name as string) ?? "",
          teamSide:
            side === "amber" || side === "sapphire"
              ? (side as "amber" | "sapphire")
              : null,
          won: (row.won as boolean | null) ?? null,
          heroId: Number(row.hero_id),
          heroName: hero.name,
          heroImageUrl: hero.imageUrl || null,
          kills: Number(row.kills ?? 0),
          deaths: Number(row.deaths ?? 0),
          assists: Number(row.assists ?? 0),
          netWorth: Number(row.net_worth ?? 0),
          isMvp: Boolean(row.is_mvp),
          durationSeconds: (row.duration_seconds as number | null) ?? null,
        };
      },
    );

    const heroes = prefs.map((pref) => {
      const meta = heroMap.get(pref.hero_id);
      return {
        id: pref.hero_id,
        name: meta?.name ?? `Héros #${pref.hero_id}`,
        images: {
          icon_hero_card: meta?.imageUrl || undefined,
          icon_hero_card_webp: meta?.imageUrl || undefined,
          icon_image_small: meta?.imageUrl || undefined,
          icon_image_small_webp: meta?.imageUrl || undefined,
        },
      };
    });

    return NextResponse.json({
      user: {
        id: userId,
        profile,
        displayLabel: profileDisplayName(profile),
        prefs,
        heroes,
        showmatchPlayer,
        showmatchHistory,
        showmatchBadges,
        rank,
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("GET /api/account/profil failed:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
