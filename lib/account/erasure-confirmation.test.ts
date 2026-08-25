import { describe, expect, it } from "vitest";

import {
  ACCOUNT_ERASURE_CONFIRMATION,
  isAccountErasureConfirmation,
} from "./erasure-confirmation";

describe("isAccountErasureConfirmation", () => {
  it("accepte la phrase exacte", () => {
    expect(isAccountErasureConfirmation(ACCOUNT_ERASURE_CONFIRMATION)).toBe(
      true,
    );
  });

  it("ignore les espaces autour", () => {
    expect(isAccountErasureConfirmation("  Supprimer  ")).toBe(true);
  });

  it("refuse une casse différente ou un mot voisin", () => {
    expect(isAccountErasureConfirmation("supprimer")).toBe(false);
    expect(isAccountErasureConfirmation("SUPPRIMER")).toBe(false);
    expect(isAccountErasureConfirmation("Oui")).toBe(false);
    expect(isAccountErasureConfirmation("")).toBe(false);
  });
});
