"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";

import { ACCOUNT_TEAMS_ENABLED } from "@/lib/account/features";
import { createTeam, getCurrentUserId } from "@/lib/account/queries";

export async function createTeamAction(formData: FormData) {
  if (!ACCOUNT_TEAMS_ENABLED) {
    redirect("/profil");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/auth/login?next=/equipes/nouvelle");
  }

  const name = String(formData.get("name") ?? "");
  const tag = String(formData.get("tag") ?? "");

  try {
    const team = await createTeam({ name, tag });
    revalidatePath("/profil");
    revalidatePath(`/equipes/${team.id}`);
    redirect(`/equipes/${team.id}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error ? error.message : "create_failed";
    redirect(`/equipes/nouvelle?error=${encodeURIComponent(message)}`);
  }
}
