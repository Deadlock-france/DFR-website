import { afterEach, describe, expect, it } from "vitest";

import {
  buildPatchNoteSitemapEntries,
  buildRobots,
  buildShowmatchSitemapEntries,
  buildStaticSitemapEntries,
} from "./crawlers";
import { ROBOTS_DISALLOW_PATHS } from "./paths";

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

describe("buildRobots", () => {
  it("autorise le crawl public et bloque les espaces privés", () => {
    delete process.env.SITE_ACCESS_PASSWORD;
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_SITE_URL = "https://deadlock-france.fr";

    const robots = buildRobots();
    expect(robots.sitemap).toBe("https://deadlock-france.fr/sitemap.xml");
    expect(robots.rules).toEqual(
      expect.objectContaining({
        allow: "/",
        disallow: [...ROBOTS_DISALLOW_PATHS],
      }),
    );
  });

  it("bloque tout le site en preview", () => {
    delete process.env.SITE_ACCESS_PASSWORD;
    process.env.VERCEL_ENV = "preview";

    const robots = buildRobots();
    expect(robots.rules).toEqual(
      expect.objectContaining({ disallow: "/" }),
    );
    expect(robots.sitemap).toBeUndefined();
  });
});

describe("sitemap entries", () => {
  it("liste uniquement les routes publiques statiques", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://deadlock-france.fr";
    const entries = buildStaticSitemapEntries(new Date("2026-08-13"));
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      "https://deadlock-france.fr",
      "https://deadlock-france.fr/patch-notes",
      "https://deadlock-france.fr/showmatch",
    ]);
    expect(urls.some((url) => url.includes("/profil"))).toBe(false);
    expect(urls.some((url) => url.includes("/acces"))).toBe(false);
  });

  it("ajoute les patch notes avec leur date Steam", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://deadlock-france.fr";
    const [entry] = buildPatchNoteSitemapEntries([
      { gid: "gid-1", date: 1_786_608_000 },
    ]);

    expect(entry.url).toBe("https://deadlock-france.fr/patch-notes/gid-1");
    expect(entry.lastModified).toEqual(new Date(1_786_608_000 * 1000));
    expect(entry.priority).toBe(0.7);
  });

  it("ajoute les séries showmatch", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://deadlock-france.fr";
    const [entry] = buildShowmatchSitemapEntries([
      { id: "sm-1", lastModified: "2026-08-13T20:00:00+02:00" },
    ]);

    expect(entry.url).toBe("https://deadlock-france.fr/showmatch/sm-1");
    expect(entry.priority).toBe(0.6);
  });
});
