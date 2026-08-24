"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  ACCOUNT_PROFILE_EDIT_ENABLED,
  ACCOUNT_SHOWMATCH_NICKNAME_CLAIM_ENABLED,
} from "@/lib/account/features";
import { getCurrentUserId, updateDisplayName } from "@/lib/account/queries";
import { createClient } from "@/lib/supabase/server";
import { eraseOwnAccount } from "@/lib/account/delete-account";
import { claimShowmatchPlayerByNickname } from "@/lib/account/showmatch-claim";

export async function updateDisplayNameAction(formData: FormData) {
  if (!ACCOUNT_PROFILE_EDIT_ENABLED) {
    redirect("/profil");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/auth/login?next=/profil");
  }

  const displayName = String(formData.get("display_name") ?? "");

  try {
    await updateDisplayName(userId, displayName);
    revalidatePath("/profil");
    redirect("/profil?saved=1");
  } catch (error) {
    unstable_rethrow(error);
    redirect("/profil?error=display_name");
  }
}

export async function claimShowmatchNicknameAction(formData: FormData) {
  if (!ACCOUNT_SHOWMATCH_NICKNAME_CLAIM_ENABLED) {
    redirect("/profil");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/auth/login?next=/profil");
  }

  const nickname = String(formData.get("showmatch_nickname") ?? "");

  try {
    await claimShowmatchPlayerByNickname(userId, nickname);
    revalidatePath("/profil");
    redirect("/profil?claim=1");
  } catch (error) {
    unstable_rethrow(error);
    const code = error instanceof Error ? error.message : "claim_failed";
    const known = new Set([
      "nickname_not_found",
      "ambiguous_nickname",
      "nickname_already_claimed",
      "missing_discord",
      "invalid_nickname",
      "claim_failed",
      "claim_disabled",
    ]);
    redirect(
      `/profil?claim_error=${encodeURIComponent(known.has(code) ? code : "claim_failed")}`,
    );
  }
}

export async function deleteOwnAccountAction() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/auth/login?next=/profil");
  }

  try {
    await eraseOwnAccount(userId);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Account erasure failed:", error);
    redirect("/profil?error=delete_account");
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Sign-out after account erasure failed:", error);
  }

  revalidatePath("/");
  revalidatePath("/showmatch");
  revalidatePath("/profil");
  redirect("/?account_deleted=1");
}
