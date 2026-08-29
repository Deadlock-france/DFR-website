import { describe, expect, it } from "vitest";

import {
  applicationStatusLabel,
  applicationTypeLabel,
  isApplicationType,
  validateApplicationInput,
} from "@/lib/admin/application-types";

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
