/** Types + helpers métier admin CMS. */

export type CmsPublicationStatus = "draft" | "published";

export type SiteAdminRow = {
  discord_id: string;
  display_label: string;
  created_at: string;
  revoked_at: string | null;
};

export type SiteAnnouncement = {
  id: string;
  title: string;
  body: string;
  status: CmsPublicationStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteNewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_markdown: string;
  cover_url: string | null;
  status: CmsPublicationStatus;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export function slugifyNewsTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}

export function isAnnouncementActiveNow(
  row: Pick<SiteAnnouncement, "status" | "starts_at" | "ends_at">,
  now = new Date(),
): boolean {
  if (row.status !== "published") return false;
  const t = now.getTime();
  if (row.starts_at && new Date(row.starts_at).getTime() > t) return false;
  if (row.ends_at && new Date(row.ends_at).getTime() < t) return false;
  return true;
}
