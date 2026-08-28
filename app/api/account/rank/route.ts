import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { toPlayerRankSnapshot } from "@/lib/account/player-rank";
import { getCurrentUserId } from "@/lib/account/queries";
import { fetchDeadlockRankBadge } from "@/lib/deadlock/player-rank";
import { toSteamAccountId } from "@/lib/deadlock/steam-id";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    let force = false;
    try {
      const body = (await request.json()) as { force?: unknown };
      force = body?.force === true;
    } catch {
      // Corps vide : premier fetch.
    }

    const admin = createServiceRoleClient();
    const { data: player, error } = await admin
      .from("players")
      .select("id, steam_id32, ranked_badge, ranked_fetched_at")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!player) {
      return NextResponse.json({ error: "no_player" }, { status: 404 });
    }

    const accountId = toSteamAccountId(player.steam_id32 as string | null);
    if (accountId == null) {
      return NextResponse.json(
        {
          error: "no_steam",
          rank: toPlayerRankSnapshot({
            hasSteam: false,
            badge: null,
            fetchedAt: null,
          }),
        },
        { status: 400 },
      );
    }

    const current = toPlayerRankSnapshot({
      hasSteam: true,
      badge: (player.ranked_badge as number | null) ?? null,
      fetchedAt: (player.ranked_fetched_at as string | null) ?? null,
    });

    if (!force && current.fetchedAt) {
      return NextResponse.json({ rank: current });
    }

    if (force && !current.canRefresh) {
      return NextResponse.json(
        { error: "cooldown", rank: current },
        { status: 429 },
      );
    }

    const badge = await fetchDeadlockRankBadge(accountId);
    const fetchedAt = new Date().toISOString();

    const { error: updateError } = await admin
      .from("players")
      .update({
        ranked_badge: badge,
        ranked_fetched_at: fetchedAt,
      })
      .eq("id", player.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      rank: toPlayerRankSnapshot({
        hasSteam: true,
        badge,
        fetchedAt,
      }),
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("POST /api/account/rank failed:", error);
    return NextResponse.json({ error: "rank_fetch_failed" }, { status: 502 });
  }
}
