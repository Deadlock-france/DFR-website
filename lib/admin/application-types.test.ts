import { describe, expect, it } from "vitest";

import {
  APPLICATION_QUOTA_LIMIT,
  applicationQuota,
  applicationQuotaWindowStart,
  applicationStatusLabel,
  applicationTypeLabel,
  isApplicationType,
  validateApplicationInput,
} from "@/lib/admin/application-types";

const NOW = new Date("2026-08-29T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("application-types", () => {
  it("valide type / subject / body", () => {
    expect(isApplicationType("staff")).toBe(true);
    expect(isApplicationType("nope")).toBe(false);

    expect(
      validateApplicationInput({
        type: "partner",
        subject: "Partenariat stream",
        body: "Bonjour, voici ma proposition de partenariat détaillée.",
      }),
    ).toMatchObject({ ok: true, type: "partner" });

    expect(
      validateApplicationInput({
        type: "staff",
        subject: "ab",
        body: "trop court",
      }),
    ).toEqual({ ok: false, error: "invalid_subject" });

    expect(
      validateApplicationInput({
        type: "other",
        subject: "Demande diverse",
        body: "encore trop court",
      }),
    ).toEqual({ ok: false, error: "invalid_body" });
  });

  it("labels FR", () => {
    expect(applicationTypeLabel("staff")).toBe("Staff");
    expect(applicationStatusLabel("pending")).toBe("En attente");
  });
});

describe("applicationQuota", () => {
  it("décompte les envois de la fenêtre glissante", () => {
    const quota = applicationQuota([daysAgo(1), daysAgo(10)], NOW);
    expect(quota).toMatchObject({
      limit: APPLICATION_QUOTA_LIMIT,
      used: 2,
      remaining: 1,
      resetAt: null,
    });
  });

  it("ignore ce qui est sorti de la fenêtre", () => {
    const quota = applicationQuota(
      [daysAgo(31), daysAgo(60), daysAgo(2)],
      NOW,
    );
    expect(quota.used).toBe(1);
    expect(quota.remaining).toBe(2);
  });

  it("bloque à la limite et annonce la libération du plus ancien créneau", () => {
    const quota = applicationQuota([daysAgo(25), daysAgo(3), daysAgo(1)], NOW);
    expect(quota.remaining).toBe(0);
    expect(quota.resetAt).toBe(
      new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it("ignore les dates illisibles", () => {
    expect(applicationQuota(["pas-une-date", daysAgo(1)], NOW).used).toBe(1);
  });

  it("expose le début de fenêtre utilisé côté requête", () => {
    expect(applicationQuotaWindowStart(NOW)).toBe(daysAgo(30));
  });
});
