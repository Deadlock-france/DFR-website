import type { User } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/lib/supabase/admin";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** Champs Discord utiles pour le profil site. */
export type DiscordIdentityFields = {
  discord_id: string | null;
  username: string;
  global_name: string;
  avatar_url: string | null;
};

/**
 * Mapping OAuth Discord → profil.
 * Priorité du nom d'affichage : custom_claims.global_name, puis full_name / name.
 */
export function parseDiscordIdentity(
  meta: Record<string, unknown>,
): DiscordIdentityFields {
  const customClaims = asRecord(meta.custom_claims);

  const username =
    asString(meta.preferred_username) ??
    asString(meta.user_name) ??
    asString(meta.name) ??
    "joueur";

  const global_name =
    asString(customClaims.global_name) ??
    asString(meta.global_name) ??
    asString(meta.full_name) ??
    asString(meta.name) ??
    username;

  const avatar_url = asString(meta.avatar_url) ?? asString(meta.picture);

  const discord_id = asString(meta.provider_id) ?? asString(meta.sub);

  return { discord_id, username, global_name, avatar_url };
}

/**
 * Resynchronise profiles.global_name / avatar / username depuis les métadonnées
 * Auth (appelé à chaque login Discord).
 */
export async function syncDiscordProfileFromAuthUser(
  user: Pick<User, "id" | "user_metadata">,
): Promise<DiscordIdentityFields> {
  const meta = asRecord(user.user_metadata);
  const fields = parseDiscordIdentity(meta);
  const sb = createServiceRoleClient();

  const { error } = await sb.from("profiles").upsert(
    {
      id: user.id,
      discord_id: fields.discord_id ?? user.id,
      username: fields.username,
      global_name: fields.global_name,
      avatar_url: fields.avatar_url,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;
  return fields;
}
