import { describe, expect, it, afterEach } from "vitest";

import {
  createSiteAccessToken,
  isSiteAccessEnabled,
  isSiteAccessPublicPath,
  verifySiteAccessToken,
  verifySitePassword,
} from "./site-access";

const ORIGINAL = {
  password: process.env.SITE_ACCESS_PASSWORD,
  secret: process.env.SITE_ACCESS_SECRET,
};

afterEach(() => {
  process.env.SITE_ACCESS_PASSWORD = ORIGINAL.password;
  process.env.SITE_ACCESS_SECRET = ORIGINAL.secret;
});

describe("site-access", () => {
  it("est désactivé sans mot de passe", () => {
    delete process.env.SITE_ACCESS_PASSWORD;
    expect(isSiteAccessEnabled()).toBe(false);
    expect(verifySitePassword("anything")).toBe(true);
  });

  it("valide le bon mot de passe", () => {
    process.env.SITE_ACCESS_PASSWORD = "preview-secret";
    expect(isSiteAccessEnabled()).toBe(true);
    expect(verifySitePassword("preview-secret")).toBe(true);
    expect(verifySitePassword("wrong")).toBe(false);
  });

  it("émet un cookie token vérifiable", () => {
    process.env.SITE_ACCESS_PASSWORD = "preview-secret";
    process.env.SITE_ACCESS_SECRET = "hmac-secret";
    const token = createSiteAccessToken();
    expect(verifySiteAccessToken(token)).toBe(true);
    expect(verifySiteAccessToken("nope")).toBe(false);
  });

  it("autorise uniquement les chemins publics du portail", () => {
    expect(isSiteAccessPublicPath("/acces")).toBe(true);
    expect(isSiteAccessPublicPath("/api/site-access")).toBe(true);
    expect(isSiteAccessPublicPath("/api/showmatch/ingest")).toBe(true);
    expect(isSiteAccessPublicPath("/")).toBe(false);
    expect(isSiteAccessPublicPath("/profil")).toBe(false);
  });
});
