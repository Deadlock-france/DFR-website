import { createPublicClient } from "@/lib/supabase/public";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type {
  CmsPublicationStatus,
  SiteAnnouncement,
  SiteNewsArticle,
} from "@/lib/admin/types";
import { isAnnouncementActiveNow } from "@/lib/admin/types";

export async function listActiveAnnouncements(): Promise<SiteAnnouncement[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_announcements")
    .select("*")
    .eq("status", "published")
    .order("starts_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  const rows = (data ?? []) as SiteAnnouncement[];
  return rows.filter((row) => isAnnouncementActiveNow(row));
}

export async function listAllAnnouncementsAdmin(): Promise<SiteAnnouncement[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_announcements")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SiteAnnouncement[];
}

export async function getAnnouncementAdmin(
  id: string,
): Promise<SiteAnnouncement | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as SiteAnnouncement | null) ?? null;
}

export async function listPublishedNews(limit = 20): Promise<SiteNewsArticle[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_news")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SiteNewsArticle[];
}

export async function getPublishedNewsBySlug(
  slug: string,
): Promise<SiteNewsArticle | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_news")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return (data as SiteNewsArticle | null) ?? null;
}

export async function listAllNewsAdmin(): Promise<SiteNewsArticle[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_news")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SiteNewsArticle[];
}

export async function getNewsAdmin(id: string): Promise<SiteNewsArticle | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_news")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as SiteNewsArticle | null) ?? null;
}

export type AnnouncementWriteInput = {
  title: string;
  body: string;
  status: CmsPublicationStatus;
  starts_at: string | null;
  ends_at: string | null;
};

export type NewsWriteInput = {
  slug: string;
  title: string;
  excerpt: string;
  body_markdown: string;
  cover_url: string | null;
  status: CmsPublicationStatus;
  published_at: string | null;
};

export async function insertAnnouncement(
  input: AnnouncementWriteInput,
  userId: string,
): Promise<SiteAnnouncement> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("site_announcements")
    .insert({
      ...input,
      created_by: userId,
      updated_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteAnnouncement;
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementWriteInput,
  userId: string,
): Promise<SiteAnnouncement> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_announcements")
    .update({
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteAnnouncement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("site_announcements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function insertNews(
  input: NewsWriteInput,
  userId: string,
): Promise<SiteNewsArticle> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("site_news")
    .insert({
      ...input,
      created_by: userId,
      updated_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteNewsArticle;
}

export async function updateNews(
  id: string,
  input: NewsWriteInput,
  userId: string,
): Promise<SiteNewsArticle> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_news")
    .update({
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteNewsArticle;
}

export async function deleteNews(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("site_news").delete().eq("id", id);
  if (error) throw error;
}
