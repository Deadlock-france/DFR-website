"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ACCOUNT_FRIENDS_ENABLED,
  ACCOUNT_NOTIFICATIONS_ENABLED,
  ACCOUNT_TEAMS_ENABLED,
} from "@/lib/account/features";
import {
  getCurrentUserId,
  inviteToTeam,
  kickTeamMember,
  leaveTeam,
  respondToTeamInvite,
  searchPlayers,
  setHeroPrefs,
} from "@/lib/account/queries";
import type { InviteRole, PlayerSearchResult } from "@/lib/account/types";

export async function searchPlayersAction(input: {
  query: string;
  teamId?: string;
}): Promise<{ results: PlayerSearchResult[]; error?: string }> {
  if (!ACCOUNT_TEAMS_ENABLED && !ACCOUNT_FRIENDS_ENABLED) {
    return { results: [], error: "disabled" };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { results: [], error: "unauthenticated" };
  }

  try {
    const results = await searchPlayers({
      query: input.query,
      teamId: input.teamId,
    });
    return { results };
  } catch (error) {
    console.error("searchPlayersAction failed:", error);
    return { results: [], error: "search_failed" };
  }
}

export async function invitePlayerAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  teamId?: string;
}> {
  if (!ACCOUNT_TEAMS_ENABLED) {
    return { ok: false, error: "disabled" };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: "unauthenticated" };
  }

  const teamId = String(formData.get("team_id") ?? "");
  const inviteeId = String(formData.get("invitee_id") ?? "");
  const roleRaw = String(formData.get("role") ?? "member");
  const role: InviteRole =
    roleRaw === "substitute" ? "substitute" : "member";

  try {
    await inviteToTeam({ teamId, inviteeId, role });
    return { ok: true, teamId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "invite_failed";
    return { ok: false, error: message, teamId };
  }
}

export async function respondInviteAction(
  inviteId: string,
  accept: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!ACCOUNT_TEAMS_ENABLED && !ACCOUNT_NOTIFICATIONS_ENABLED) {
    return { ok: false, error: "disabled" };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: "unauthenticated" };
  }

  try {
    await respondToTeamInvite({ inviteId, accept });
    return { ok: true };
  } catch (error) {
    console.error("respondInviteAction failed:", error);
    return { ok: false, error: "invite" };
  }
}

export async function leaveTeamAction(
  teamId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!ACCOUNT_TEAMS_ENABLED) {
    return { ok: false, error: "disabled" };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: "unauthenticated" };
  }

  try {
    await leaveTeam(teamId);
    return { ok: true };
  } catch (error) {
    console.error("leaveTeamAction failed:", error);
    const message = error instanceof Error ? error.message : "leave_failed";
    if (message.includes("captain cannot leave")) {
      return { ok: false, error: "captain" };
    }
    return { ok: false, error: "leave_failed" };
  }
}

export async function kickTeamMemberAction(
  teamId: string,
  profileId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!ACCOUNT_TEAMS_ENABLED) {
    return { ok: false, error: "disabled" };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: "unauthenticated" };
  }

  try {
    await kickTeamMember({ teamId, profileId });
    return { ok: true };
  } catch (error) {
    console.error("kickTeamMemberAction failed:", error);
    return { ok: false, error: "kick_failed" };
  }
}

export async function saveHeroPrefsAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/auth/login?next=/profil");
  }

  const prefs = ([1, 2, 3] as const).map((priority) => {
    const raw = String(formData.get(`hero_${priority}`) ?? "").trim();
    const heroId = raw ? Number(raw) : null;
    return {
      priority,
      heroId: heroId != null && Number.isFinite(heroId) ? heroId : null,
    };
  });

  const ids = prefs
    .map((p) => p.heroId)
    .filter((id): id is number => id != null);
  if (new Set(ids).size !== ids.length) {
    redirect("/profil?error=hero_dup");
  }

  try {
    await setHeroPrefs(userId, prefs);
    revalidatePath("/profil");
  } catch (error) {
    console.error("saveHeroPrefsAction failed:", error);
    redirect("/profil?error=heroes");
  }

  redirect("/profil?heroes=1");
}
