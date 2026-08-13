import type { User, UserIdentity } from "@supabase/supabase-js";

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

/** Snowflake Discord (chiffres uniquement). Rejette les UUID auth. */
export function asDiscordSnowflake(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^\d{5,32}$/.test(trimmed) ? trimmed : null;
}

/** Champs Discord utiles pour le profil site. */
export type DiscordIdentityFields = {
  discord_id: string | null;
  username: string;
  global_name: string;
  avatar_url: string | null;
};

export type DiscordIdentityRef = {
  providerId: string;
  identityData: Record<string, unknown>;
};

/**
 * Mapping OAuth Discord → profil.
 * Priorité du nom d'affichage : custom_claims.global_name, puis full_name / name.
 * Ne pas utiliser le discord_id renvoyé ici pour une autorisation : filtrer
 * via `pickDiscordIdentity` / `asDiscordSnowflake`.
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

export function pickDiscordIdentity(
  identities: UserIdentity[] | null | undefined,
): DiscordIdentityRef | null {
  const discord = (identities ?? []).find(
    (identity) => identity.provider === "discord",
  );
  if (!discord) return null;

  const identityData = asRecord(discord.identity_data);
  const providerId =
    asDiscordSnowflake(asString(identityData.provider_id)) ??
    asDiscordSnowflake(asString(identityData.sub)) ??
    asDiscordSnowflake(asString(discord.id));

  if (!providerId) return null;
  return { providerId, identityData };
}

export function fieldsFromDiscordIdentity(
  identity: DiscordIdentityRef,
): DiscordIdentityFields {
  const parsed = parseDiscordIdentity(identity.identityData);
  return { ...parsed, discord_id: identity.providerId };
}

export async function resolveDiscordIdentity(
  userId: string,
  user?: Pick<User, "identities"> | null,
): Promise<DiscordIdentityRef | null> {
  const fromUser = pickDiscordIdentity(user?.identities);
  if (fromUser) return fromUser;

  const sb = createServiceRoleClient();
  const { data, error } = await sb.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return pickDiscordIdentity(data.user.identities);
}

/**
 * Resynchronise le profil depuis auth.identities (jamais user_metadata).
 */
export async function syncDiscordProfileFromAuthUser(
  user: Pick<User, "id" | "identities">,
): Promise<DiscordIdentityFields> {
  const identity = await resolveDiscordIdentity(user.id, user);
  const fields = identity
    ? fieldsFromDiscordIdentity(identity)
    : {
        discord_id: null,
        username: "joueur",
        global_name: "joueur",
        avatar_url: null,
      };

  const sb = createServiceRoleClient();
  const row: {
    id: string;
    username: string;
    global_name: string;
    avatar_url: string | null;
    updated_at: string;
    discord_id?: string;
  } = {
    id: user.id,
    username: fields.username,
    global_name: fields.global_name,
    avatar_url: fields.avatar_url,
    updated_at: new Date().toISOString(),
  };

  if (fields.discord_id) {
    const { data: taken } = await sb
      .from("profiles")
      .select("id")
      .eq("discord_id", fields.discord_id)
      .neq("id", user.id)
      .maybeSingle();
    if (!taken) {
      row.discord_id = fields.discord_id;
    }
  }

  const { error } = await sb.from("profiles").upsert(row, { onConflict: "id" });

  if (error) throw error;
  return fields;
}
