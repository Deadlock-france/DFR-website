import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/account/queries";
import type { AccountDockUser } from "@/lib/account/types";
import { profileDisplayName } from "@/lib/account/types";
import { createReadonlyClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ user: null as AccountDockUser | null });
    }

    const supabase = await createReadonlyClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, display_name, global_name, username, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    const user: AccountDockUser = {
      id: profile?.id ?? userId,
      displayLabel: profile
        ? profileDisplayName({
            display_name: profile.display_name,
            global_name: profile.global_name,
            username: profile.username,
          })
        : "Joueur",
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
