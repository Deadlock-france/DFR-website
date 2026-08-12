import { createHash, createHmac, timingSafeEqual } from "crypto";

export const SITE_ACCESS_COOKIE = "dfr_site_access";

/** Cookie valide 30 jours. */
export const SITE_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getSiteAccessPassword(): string | null {
  const value = process.env.SITE_ACCESS_PASSWORD?.trim();
  return value ? value : null;
}

export function isSiteAccessEnabled(): boolean {
  return getSiteAccessPassword() !== null;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifySitePassword(input: string): boolean {
  const expected = getSiteAccessPassword();
  if (!expected) return true;
  const a = sha256(input);
  const b = sha256(expected);
  return timingSafeEqual(a, b);
}

function accessSecret(): string {
  return (
    process.env.SITE_ACCESS_SECRET?.trim() ||
    getSiteAccessPassword() ||
    "disabled"
  );
}

export function createSiteAccessToken(): string {
  const password = getSiteAccessPassword() ?? "";
  return createHmac("sha256", accessSecret())
    .update(`dfr-site-access:v1:${password}`)
    .digest("base64url");
}

export function verifySiteAccessToken(token: string | undefined): boolean {
  if (!isSiteAccessEnabled()) return true;
  if (!token) return false;
  const expected = createSiteAccessToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isSiteAccessPublicPath(pathname: string): boolean {
  return (
    pathname === "/acces" ||
    pathname === "/api/site-access" ||
    pathname === "/api/showmatch/ingest"
  );
}
