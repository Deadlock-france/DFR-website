"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/account/queries";
import { requirePermission } from "@/lib/admin/access";
import {
  insertMyApplication,
  reviewApplication,
} from "@/lib/admin/applications";
import { validateApplicationInput } from "@/lib/admin/application-types";

function revalidateApplications() {
  revalidatePath("/candidatures");
  revalidatePath("/admin");
  revalidatePath("/admin/candidatures");
}

export async function submitApplicationAction(formData: FormData) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    redirect("/auth/login?next=/candidatures");
  }

  const validated = validateApplicationInput({
    type: String(formData.get("type") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!validated.ok) {
    redirect(`/candidatures?error=${validated.error}`);
  }

  try {
    await insertMyApplication({
      userId,
      type: validated.type,
      subject: validated.subject,
      body: validated.body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "save_failed";
    if (message === "pending_exists") {
      redirect("/candidatures?error=pending_exists");
    }
    redirect("/candidatures?error=save_failed");
  }

  revalidateApplications();
  redirect("/candidatures?ok=1");
}

export async function reviewApplicationAction(formData: FormData) {
  const admin = await requirePermission("admin.applications");
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

  await reviewApplication({
    id,
    status: decision,
    adminNote,
    reviewerId: admin.userId,
  });

  revalidateApplications();
  revalidatePath(`/admin/candidatures/${id}`);
  redirect("/admin/candidatures");
}
