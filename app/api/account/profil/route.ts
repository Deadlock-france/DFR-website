import { NextResponse } from "next/server";

import {
  claimAndGetShowmatchPlayer,
  getCurrentUserId,
  getHeroPrefs,
  getProfile,
  getShowmatchHistoryForPlayer,
} from "@/lib/account/queries";
import { profileDisplayName } from "@/lib/account/types";
import { getDeadlockHeroes } from "@/lib/deadlock/client";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const [profile, prefs, heroes] = await Promise.all([
      getProfile(userId),
      getHeroPrefs(userId),
      getDeadlockHeroes({ onlyActive: true }),
    ]);

    if (!profile) {
      return NextResponse.json({ user: { id: userId, profile: null } });
    }

    const showmatchPlayer = await claimAndGetShowmatchPlayer(userId);
    const showmatchHistory = showmatchPlayer
      ? await getShowmatchHistoryForPlayer(showmatchPlayer.id, heroes)
      : [];

    return NextResponse.json({
      user: {
        id: userId,
        profile,
        displayLabel: profileDisplayName(profile),
        prefs,
        heroes,
        showmatchPlayer,
        showmatchHistory,
      },
    });
  } catch (error) {
    console.error("GET /api/account/profil failed:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
