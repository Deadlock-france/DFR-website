import { NextResponse } from "next/server";

import { getCurrentUserId, getProfile } from "@/lib/account/queries";
import type { AccountDockUser } from "@/lib/account/types";
import { profileDisplayName } from "@/lib/account/types";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ user: null as AccountDockUser | null });
    }

    const profile = await getProfile(userId);

    const user: AccountDockUser = {
      id: profile?.id ?? userId,
      displayLabel: profile ? profileDisplayName(profile) : "Joueur",
      avatarUrl: profile?.avatar_url ?? null,
      teams: [],
      friends: [],
      pendingInvites: [],
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/account/me failed:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
