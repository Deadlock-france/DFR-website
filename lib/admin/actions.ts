"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/access";
import {
  deleteAnnouncement,
  deleteNews,
  insertAnnouncement,
  insertNews,
  updateAnnouncement,
  updateNews,
} from "@/lib/admin/cms";
import type { CmsPublicationStatus } from "@/lib/admin/types";
import { slugifyNewsTitle } from "@/lib/admin/types";
import { normalizeIngestDateTime } from "@/lib/showmatch/timezone";

function asStatus(value: FormDataEntryValue | null): CmsPublicationStatus {
  return value === "published" ? "published" : "draft";
}

/** datetime-local (sans fuseau) → ISO UTC, interprété Europe/Paris. */
function asOptionalIso(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizeIngestDateTime(value.trim());
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function revalidatePublicCms() {
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/admin");
  revalidatePath("/admin/annonces");
  revalidatePath("/admin/news");
}

export async function saveAnnouncementAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = asStatus(formData.get("status"));
  const starts_at = asOptionalIso(formData.get("starts_at"));
  const ends_at = asOptionalIso(formData.get("ends_at"));

  if (!title) throw new Error("title_required");

  const payload = { title, body, status, starts_at, ends_at };

  if (id) {
    await updateAnnouncement(id, payload, admin.userId);
  } else {
    await insertAnnouncement(payload, admin.userId);
  }

  revalidatePublicCms();
  redirect("/admin/annonces");
}

export async function deleteAnnouncementAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("id_required");
  await deleteAnnouncement(id);
  revalidatePublicCms();
  redirect("/admin/annonces");
}

export async function saveNewsAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const body_markdown = String(formData.get("body_markdown") ?? "");
  const coverRaw = String(formData.get("cover_url") ?? "").trim();
  const cover_url = coverRaw || null;
  const status = asStatus(formData.get("status"));
  let published_at = asOptionalIso(formData.get("published_at"));

  if (!title) throw new Error("title_required");
  if (!slug) slug = slugifyNewsTitle(title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("invalid_slug");
  }

  if (status === "published" && !published_at) {
    published_at = new Date().toISOString();
  }
  if (status === "draft") {
    published_at = published_at; // conserve si déjà set
  }

  const payload = {
    slug,
    title,
    excerpt,
    body_markdown,
    cover_url,
    status,
    published_at: status === "published" ? published_at : published_at,
  };

  let articleId = id;
  try {
    if (id) {
      await updateNews(id, payload, admin.userId);
    } else {
      const created = await insertNews(payload, admin.userId);
      articleId = created.id;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "save_failed";
    throw new Error(message);
  }

  if (!articleId) throw new Error("save_failed");

  revalidatePublicCms();
  revalidatePath(`/news/${slug}`);
  revalidatePath(`/admin/news/${articleId}`);
  // Pas de redirect() ici : l’appel vient du client (transition).
  // Le formulaire navigue vers la page d’édition avec l’id retourné.
  return { id: articleId };
}

export async function deleteNewsAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("id_required");
  await deleteNews(id);
  revalidatePublicCms();
  redirect("/admin/news");
}
