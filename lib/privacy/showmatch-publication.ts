import type { ShowmatchPlayerRef } from "@/lib/showmatch/types";

/**
 * Publication des showmatchs (RGPD).
 *
 * Inscription au showmatch = le pseudo Discord / display name peut apparaître
 * sur le site. Les identifiants stables (snowflake Discord, SteamID32) restent
 * hors pages publiques tant que ces drapeaux sont à `false`.
 *
 * Passer un drapeau à `true` uniquement avec une base légale dédiée
 * (consentement). Ne pas oublier d’aligner la migration SQL (REVOKE colonnes).
 */
export type ShowmatchPublicIdentifierOptions = {
  includeDiscordId: boolean;
  includeSteamId32: boolean;
  includeCasterDiscordId: boolean;
};

export const SHOWMATCH_PUBLIC_IDENTIFIERS: ShowmatchPublicIdentifierOptions = {
  includeDiscordId: false,
  includeSteamId32: false,
  includeCasterDiscordId: false,
};

export type ShowmatchPublicPlayerInput = {
  id: string;
  displayName: string;
  discordUsername: string;
  avatarUrl: string | null;
  discordId?: string | null;
  steamId32?: string | null;
};

export function toPublicShowmatchPlayerRef(
  player: ShowmatchPublicPlayerInput,
  options: ShowmatchPublicIdentifierOptions = SHOWMATCH_PUBLIC_IDENTIFIERS,
): ShowmatchPlayerRef {
  const published: ShowmatchPlayerRef = {
    id: player.id,
    displayName: player.displayName,
    discordUsername: player.discordUsername,
    avatarUrl: player.avatarUrl,
  };

  if (options.includeDiscordId) {
    published.discordId = player.discordId ?? null;
  }
  if (options.includeSteamId32) {
    published.steamId32 = player.steamId32 ?? null;
  }

  return published;
}

/** Colonnes `players` embarquées dans le select public PostgREST. */
export function publicPlayerEmbedColumns(
  options: ShowmatchPublicIdentifierOptions = SHOWMATCH_PUBLIC_IDENTIFIERS,
): string[] {
  const columns = ["id", "display_name", "discord_username", "avatar_url"];
  if (options.includeDiscordId) columns.push("discord_id");
  if (options.includeSteamId32) columns.push("steam_id32");
  return columns;
}
