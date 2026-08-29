import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { getAdminIdentity } from "@/lib/admin/access";
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
    const [{ data: profile, error }, adminIdentity] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, global_name, username, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      getAdminIdentity().catch(() => null),
    ]);

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
      isAdmin: adminIdentity != null,
      teams: [],
      friends: [],
      pendingInvites: [],
    };

    return NextResponse.json({ user });
  } catch (error) {
    unstable_rethrow(error);
    console.error("GET /api/account/me failed:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
