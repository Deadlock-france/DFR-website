import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getCurrentUserId, getProfile } from "@/lib/account/queries";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const ADMIN_ELEVATION_COOKIE = "dfr_admin_elev";

/** Élévation admin : 8 heures. */
export const ADMIN_ELEVATION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type AdminIdentity = {
  userId: string;
  discordId: string;
  displayLabel: string;
};

function getAdminUnlockSecret(): string | null {
  const value = process.env.ADMIN_UNLOCK_SECRET?.trim();
  return value ? value : null;
}

export function isAdminUnlockConfigured(): boolean {
  return getAdminUnlockSecret() !== null;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifyAdminUnlockSecret(input: string): boolean {
  const expected = getAdminUnlockSecret();
  if (!expected) return false;
  const a = sha256(input);
  const b = sha256(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function elevationHmacSecret(): string {
  return getAdminUnlockSecret() ?? "admin-unlock-disabled";
}

export function createAdminElevationToken(discordId: string): string {
  const secret = getAdminUnlockSecret() ?? "";
  return createHmac("sha256", elevationHmacSecret())
    .update(`dfr-admin-elev:v1:${discordId}:${secret}`)
    .digest("base64url");
}

export function verifyAdminElevationToken(
  token: string | undefined,
  discordId: string,
): boolean {
  if (!token || !getAdminUnlockSecret()) return false;
  const expected = createAdminElevationToken(discordId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function lookupActiveAdmin(
  discordId: string,
): Promise<{ discord_id: string; display_label: string } | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_admins")
    .select("discord_id, display_label, revoked_at")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.revoked_at) return null;
  return {
    discord_id: data.discord_id as string,
    display_label: data.display_label as string,
  };
}

/**
 * Session Discord + allowlist site_admins.
 * Retourne null si non connecté / pas admin (sans lever d’erreur).
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const profile = await getProfile(userId);
  const discordId = profile?.discord_id?.trim();
  if (!discordId) return null;

  const admin = await lookupActiveAdmin(discordId);
  if (!admin) return null;

  return {
    userId,
    discordId: admin.discord_id,
    displayLabel: admin.display_label,
  };
}

/** Identité admin ou 404 (ne pas confirmer l’existence du panneau). */
export async function requireAdminIdentity(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) notFound();
  return identity;
}

export async function hasAdminElevation(discordId: string): Promise<boolean> {
  if (!isAdminUnlockConfigured()) return false;
  const jar = await cookies();
  const token = jar.get(ADMIN_ELEVATION_COOKIE)?.value;
  return verifyAdminElevationToken(token, discordId);
}

/**
 * Identité + cookie d’élévation.
 * Si identité OK sans élévation → redirect vers /admin/unlock.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const identity = await requireAdminIdentity();

  if (!isAdminUnlockConfigured()) {
    // Secret manquant en env : on bloque l’élévation (pas de bypass silencieux).
    notFound();
  }

  if (!(await hasAdminElevation(identity.discordId))) {
    redirect("/admin/unlock");
  }

  return identity;
}

/**
 * Pour les routes API : identité élevée ou null (pas de redirect / notFound).
 */
export async function getElevatedAdmin(): Promise<AdminIdentity | null> {
  const identity = await getAdminIdentity();
  if (!identity) return null;
  if (!isAdminUnlockConfigured()) return null;
  if (!(await hasAdminElevation(identity.discordId))) return null;
  return identity;
}
