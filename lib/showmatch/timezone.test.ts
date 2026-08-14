import { describe, expect, it } from "vitest";

import {
  hasExplicitTimeZone,
  interpretParisLocalAsUtcIso,
  normalizeIngestDateTime,
  parseShowmatchInstant,
} from "./timezone";

describe("showmatch timezone", () => {
  it("détecte les fuseaux explicites", () => {
    expect(hasExplicitTimeZone("2026-08-13T20:00:00Z")).toBe(true);
    expect(hasExplicitTimeZone("2026-08-13T20:00:00+02:00")).toBe(true);
    expect(hasExplicitTimeZone("2026-08-13T20:00:00")).toBe(false);
  });

  it("interprète une heure naïve comme Europe/Paris (été)", () => {
    // 20:00 à Paris (UTC+2) → 18:00Z
    expect(interpretParisLocalAsUtcIso("2026-08-13T20:00:00")).toBe(
      "2026-08-13T18:00:00.000Z",
    );
  });

  it("normalise l’ingest sans écraser un +02:00", () => {
    expect(normalizeIngestDateTime("2026-08-13T20:00:00+02:00")).toBe(
      "2026-08-13T18:00:00.000Z",
    );
    expect(normalizeIngestDateTime("2026-08-13T20:00:00")).toBe(
      "2026-08-13T18:00:00.000Z",
    );
  });

  it("parse pour l’affichage Paris", () => {
    const d = parseShowmatchInstant("2026-08-13T20:00:00");
    const label = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }).format(d);
    expect(label).toBe("20:00");
  });
});
