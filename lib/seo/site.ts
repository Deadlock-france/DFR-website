import { isSiteAccessEnabled } from "@/lib/site-access";
import { DISCORD_INVITE_URL, TWITTER_URL } from "@/lib/social/links";

export const SITE_NAME = "Deadlock France";

export const SITE_TAGLINE =
  "Patch notes, showmatchs et communauté francophone";

export const SITE_DESCRIPTION =
  "La communauté francophone de Deadlock : patch notes traduites en français, showmatchs hebdomadaires, résultats et Discord. Projet indépendant, sans lien avec Valve.";

export const SITE_LOCALE = "fr_FR";

export const SITE_LANGUAGE = "fr";

export const TWITTER_HANDLE = "@DeadlockFR";

export const DEFAULT_OG_ALT = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** Fallback si aucune URL publique n'est configurée (dev local). */
export const LOCAL_SITE_URL = "http://localhost:3000";

export const ORGANIZATION_SAME_AS = [DISCORD_INVITE_URL, TWITTER_URL] as const;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function withHttps(hostOrUrl: string): string {
  if (hostOrUrl.startsWith("http://") || hostOrUrl.startsWith("https://")) {
    return stripTrailingSlash(hostOrUrl);
  }
  return `https://${stripTrailingSlash(hostOrUrl)}`;
}

/**
 * URL canonique du site. Priorité :
 * 1. NEXT_PUBLIC_SITE_URL (domaine de prod, y compris en preview)
 * 2. VERCEL_PROJECT_PRODUCTION_URL
 * 3. localhost en développement
 *
 * On n'utilise jamais VERCEL_URL (URLs de preview) comme canonique.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return withHttps(explicit);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return withHttps(productionHost);

  return LOCAL_SITE_URL;
}

export function sitePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return getSiteUrl();
  return `${getSiteUrl()}${normalized}`;
}

export function isVercelPreview(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/**
 * Indexation uniquement en production, site déverrouillé.
 * Les previews Vercel et le mode mot de passe restent noindex.
 */
export function shouldIndexSite(): boolean {
  if (isSiteAccessEnabled()) return false;
  if (isVercelPreview()) return false;
  return true;
}

export function documentTitle(pageTitle: string): string {
  if (pageTitle === SITE_NAME || pageTitle.startsWith(`${SITE_NAME} `)) {
    return pageTitle;
  }
  return `${pageTitle} | ${SITE_NAME}`;
}
