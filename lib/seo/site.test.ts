import { afterEach, describe, expect, it } from "vitest";

import {
  documentTitle,
  getSiteUrl,
  LOCAL_SITE_URL,
  shouldIndexSite,
  SITE_NAME,
  sitePath,
} from "./site";

const ORIGINAL = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  vercelProd: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  vercelEnv: process.env.VERCEL_ENV,
  access: process.env.SITE_ACCESS_PASSWORD,
};

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL.siteUrl;
  process.env.VERCEL_PROJECT_PRODUCTION_URL = ORIGINAL.vercelProd;
  process.env.VERCEL_ENV = ORIGINAL.vercelEnv;
  process.env.SITE_ACCESS_PASSWORD = ORIGINAL.access;
});

describe("getSiteUrl", () => {
  it("privilégie NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://deadlock-france.fr/";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "preview.vercel.app";
    expect(getSiteUrl()).toBe("https://deadlock-france.fr");
  });

  it("ajoute https si le domaine est nu", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "deadlock-france.fr";
    expect(getSiteUrl()).toBe("https://deadlock-france.fr");
  });

  it("retombe sur VERCEL_PROJECT_PRODUCTION_URL", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "deadlock-france.vercel.app";
    expect(getSiteUrl()).toBe("https://deadlock-france.vercel.app");
  });

  it("utilise localhost hors production configurée", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(getSiteUrl()).toBe(LOCAL_SITE_URL);
  });
});

describe("sitePath", () => {
  it("compose une URL absolue sans double slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://deadlock-france.fr";
    expect(sitePath("/")).toBe("https://deadlock-france.fr");
    expect(sitePath("/patch-notes")).toBe(
      "https://deadlock-france.fr/patch-notes",
    );
  });
});

describe("shouldIndexSite", () => {
  it("indexe par défaut hors preview et hors mot de passe", () => {
    delete process.env.SITE_ACCESS_PASSWORD;
    delete process.env.VERCEL_ENV;
    expect(shouldIndexSite()).toBe(true);
  });

  it("désindexe les previews Vercel", () => {
    delete process.env.SITE_ACCESS_PASSWORD;
    process.env.VERCEL_ENV = "preview";
    expect(shouldIndexSite()).toBe(false);
  });

  it("désindexe le site verrouillé par mot de passe", () => {
    process.env.SITE_ACCESS_PASSWORD = "secret";
    delete process.env.VERCEL_ENV;
    expect(shouldIndexSite()).toBe(false);
  });
});

describe("documentTitle", () => {
  it("ajoute le nom du site", () => {
    expect(documentTitle("Patch notes")).toBe(`Patch notes | ${SITE_NAME}`);
  });

  it("ne double pas le nom du site", () => {
    expect(documentTitle(SITE_NAME)).toBe(SITE_NAME);
  });
});
