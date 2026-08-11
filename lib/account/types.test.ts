import { describe, expect, it } from "vitest";

import {
  normalizePlayerSearchQuery,
  normalizeTeamName,
  normalizeTeamTag,
  profileDisplayName,
  teamRoleLabel,
} from "./types";

describe("normalizeTeamTag", () => {
  it("normalise en majuscules", () => {
    expect(normalizeTeamTag("dfr")).toBe("DFR");
  });

  it("accepte 2 à 5 caractères alphanumériques", () => {
    expect(normalizeTeamTag("AB")).toBe("AB");
    expect(normalizeTeamTag("ABC12")).toBe("ABC12");
  });

  it("rejette les tags trop courts, trop longs ou invalides", () => {
    expect(normalizeTeamTag("A")).toBeNull();
    expect(normalizeTeamTag("ABCDEF")).toBeNull();
    expect(normalizeTeamTag("A-B")).toBeNull();
    expect(normalizeTeamTag("")).toBeNull();
  });
});

describe("normalizeTeamName", () => {
  it("trim et conserve un nom valide", () => {
    expect(normalizeTeamName("  Les Titans  ")).toBe("Les Titans");
  });

  it("rejette les noms hors bornes", () => {
    expect(normalizeTeamName("A")).toBeNull();
    expect(normalizeTeamName("x".repeat(41))).toBeNull();
  });
});

describe("profileDisplayName", () => {
  it("préfère display_name puis global_name puis username", () => {
    expect(
      profileDisplayName({
        display_name: "Julien",
        global_name: "Jules",
        username: "jln",
      }),
    ).toBe("Julien");

    expect(
      profileDisplayName({
        display_name: null,
        global_name: "Jules",
        username: "jln",
      }),
    ).toBe("Jules");

    expect(
      profileDisplayName({
        display_name: null,
        global_name: null,
        username: "jln",
      }),
    ).toBe("jln");
  });

  it("retombe sur Joueur si tout est vide", () => {
    expect(
      profileDisplayName({
        display_name: "  ",
        global_name: null,
        username: null,
      }),
    ).toBe("Joueur");
  });
});

describe("normalizePlayerSearchQuery", () => {
  it("accepte une requête d'au moins 2 caractères", () => {
    expect(normalizePlayerSearchQuery("  ju  ")).toBe("ju");
    expect(normalizePlayerSearchQuery("a b")).toBe("a b");
  });

  it("rejette trop court ou trop long", () => {
    expect(normalizePlayerSearchQuery("a")).toBeNull();
    expect(normalizePlayerSearchQuery("x".repeat(65))).toBeNull();
  });
});

describe("teamRoleLabel", () => {
  it("libellés FR", () => {
    expect(teamRoleLabel("captain")).toBe("Capitaine");
    expect(teamRoleLabel("member")).toBe("Membre");
    expect(teamRoleLabel("substitute")).toBe("Remplaçant");
  });
});
