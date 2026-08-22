import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient, createReadonlyClient } from "@/lib/supabase/server";
import type {
  ApplicationStatus,
  ApplicationType,
  SiteApplication,
  SiteApplicationAdminRow,
} from "@/lib/admin/application-types";

function applicantLabel(row: {
  display_name: string | null;
  global_name: string | null;
  username: string | null;
}): string {
  return (
    row.display_name?.trim() ||
    row.global_name?.trim() ||
    row.username?.split("#")[0]?.trim() ||
    "Utilisateur"
  );
}

export async function listMyApplications(
  userId: string,
): Promise<SiteApplication[]> {
  const supabase = await createReadonlyClient();
  const { data, error } = await supabase
    .from("site_applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SiteApplication[];
}

export async function insertMyApplication(input: {
  userId: string;
  type: ApplicationType;
  subject: string;
  body: string;
}): Promise<SiteApplication> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_applications")
    .insert({
      user_id: input.userId,
      type: input.type,
      subject: input.subject,
      body: input.body,
      status: "pending",
      admin_note: "",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("pending_exists");
    }
    throw error;
  }
  return data as SiteApplication;
}

export async function countApplicationsAdmin(
  status?: ApplicationStatus,
): Promise<number> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("site_applications")
    .select("id", { count: "exact", head: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function listApplicationsAdmin(
  status?: ApplicationStatus,
): Promise<SiteApplicationAdminRow[]> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("site_applications")
    .select(
      "*, profiles!user_id(display_name, global_name, username)",
    )
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = row.profiles as {
      display_name: string | null;
      global_name: string | null;
      username: string | null;
    } | null;
    const { profiles: _p, ...rest } = row as typeof row & {
      profiles?: unknown;
    };
    return {
      ...(rest as SiteApplication),
      applicant_label: profile ? applicantLabel(profile) : null,
    };
  });
}

export async function getApplicationAdmin(
  id: string,
): Promise<SiteApplicationAdminRow | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_applications")
    .select(
      "*, profiles!user_id(display_name, global_name, username)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const profile = data.profiles as {
    display_name: string | null;
    global_name: string | null;
    username: string | null;
  } | null;
  const { profiles: _p, ...rest } = data as typeof data & {
    profiles?: unknown;
  };
  return {
    ...(rest as SiteApplication),
    applicant_label: profile ? applicantLabel(profile) : null,
  };
}

export async function reviewApplication(input: {
  id: string;
  status: "accepted" | "rejected";
  adminNote: string;
  reviewerId: string;
}): Promise<SiteApplication> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: current, error: readError } = await supabase
    .from("site_applications")
    .select("status")
    .eq("id", input.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("not_found");
  if (current.status !== "pending") throw new Error("not_pending");

  const { data, error } = await supabase
    .from("site_applications")
    .update({
      status: input.status,
      admin_note: input.adminNote,
      reviewed_by: input.reviewerId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error) throw error;
  return data as SiteApplication;
}
