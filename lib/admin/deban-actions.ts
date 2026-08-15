"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getProfile, requireUserId } from "@/lib/account/queries";
import { requireAdmin } from "@/lib/admin/access";
import {
  acceptDebanRequest,
  getActiveBanForDiscordId,
  getPendingDebanForUser,
  insertDebanRequest,
  rejectDebanRequest,
} from "@/lib/admin/deban";
import { validateDebanMessage } from "@/lib/admin/deban-types";

function revalidateDeban() {
  revalidatePath("/profil");
  revalidatePath("/admin");
  revalidatePath("/admin/debans");
}

export async function submitDebanRequestAction(formData: FormData) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    redirect("/auth/login?next=/profil");
  }

  const profile = await getProfile(userId);
  const discordId = profile?.discord_id?.trim();
  if (!discordId) {
    redirect("/profil?error=deban_no_discord");
  }

  const validated = validateDebanMessage(String(formData.get("message") ?? ""));
  if (!validated.ok) {
    redirect(`/profil?error=${validated.error}`);
  }

  const ban = await getActiveBanForDiscordId(discordId);
  if (!ban) {
    redirect("/profil?error=deban_no_ban");
  }

  const pending = await getPendingDebanForUser(userId);
  if (pending) {
    redirect("/profil?error=pending_exists");
  }

  try {
    await insertDebanRequest({
      userId,
      discordId,
      banId: ban.id,
      message: validated.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "save_failed";
    if (message === "pending_exists") {
      redirect("/profil?error=pending_exists");
    }
    redirect("/profil?error=deban_save_failed");
  }

  revalidateDeban();
  redirect("/profil?deban=1");
}

export async function reviewDebanRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const adminNote = String(formData.get("admin_note") ?? "").trim();

  if (!id) throw new Error("id_required");
  if (decision !== "accepted" && decision !== "rejected") {
    throw new Error("invalid_decision");
  }
  if (adminNote.length < 3 || adminNote.length > 2000) {
    throw new Error("invalid_admin_note");
  }

  try {
    if (decision === "accepted") {
      await acceptDebanRequest({
        id,
        adminNote,
        reviewerId: admin.userId,
      });
    } else {
      await rejectDebanRequest({
        id,
        adminNote,
        reviewerId: admin.userId,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "review_failed";
    redirect(`/admin/debans/${id}?error=${encodeURIComponent(message)}`);
  }

  revalidateDeban();
  revalidatePath(`/admin/debans/${id}`);
  redirect("/admin/debans");
}
