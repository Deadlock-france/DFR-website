import { afterEach, describe, expect, it } from "vitest";

import { buildNoIndexMetadata, buildPageMetadata } from "./metadata";

const ORIGINAL = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  vercelEnv: process.env.VERCEL_ENV,
  access: process.env.SITE_ACCESS_PASSWORD,
};

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL.siteUrl;
  process.env.VERCEL_ENV = ORIGINAL.vercelEnv;
  process.env.SITE_ACCESS_PASSWORD = ORIGINAL.access;
});

describe("buildPageMetadata", () => {
  it("pose un canonical, un titre Open Graph complet et l'indexation", () => {
    delete process.env.SITE_ACCESS_PASSWORD;
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_SITE_URL = "https://deadlock-france.fr";

    const meta = buildPageMetadata({
      title: "Patch notes",
      description: "Les mises à jour Deadlock.",
      path: "/patch-notes",
    });

    expect(meta.title).toBe("Patch notes");
    expect(meta.alternates?.canonical).toBe("/patch-notes");
    expect(meta.openGraph?.title).toBe("Patch notes | Deadlock France");
    expect(meta.openGraph?.url).toBe(
      "https://deadlock-france.fr/patch-notes",
    );
    expect(meta.robots).toEqual(
      expect.objectContaining({ index: true, follow: true }),
    );
  });

  it("conserve un titre absolu sur l'accueil", () => {
    const meta = buildPageMetadata({
      title: "Deadlock France — Patch notes, showmatchs et communauté",
      description: "Communauté francophone.",
      path: "/",
      absoluteTitle: true,
    });

    expect(meta.title).toEqual({
      absolute: "Deadlock France — Patch notes, showmatchs et communauté",
    });
    expect(meta.openGraph?.title).toBe(
      "Deadlock France — Patch notes, showmatchs et communauté",
    );
  });

  it("expose les champs article", () => {
    const meta = buildPageMetadata({
      title: "Update",
      description: "Notes.",
      path: "/patch-notes/1",
      ogType: "article",
      publishedTime: "2026-08-12T00:00:00.000Z",
      authors: ["Valve"],
    });

    expect(meta.openGraph).toEqual(
      expect.objectContaining({
        type: "article",
        publishedTime: "2026-08-12T00:00:00.000Z",
        authors: ["Valve"],
      }),
    );
  });
});

describe("buildNoIndexMetadata", () => {
  it("interdit l'indexation même en production", () => {
    delete process.env.SITE_ACCESS_PASSWORD;
    delete process.env.VERCEL_ENV;

    const meta = buildNoIndexMetadata({
      title: "Mon profil",
      description: "Espace privé.",
      path: "/profil",
    });

    expect(meta.robots).toEqual(
      expect.objectContaining({ index: false, follow: false }),
    );
  });
});
