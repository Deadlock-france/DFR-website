import { describe, expect, it } from "vitest";

import {
  formatNewsDate,
  formatPatchNotesContent,
  formatPatchNotesTitle,
  formatShortNewsDate,
} from "./format";

// Midi UTC : la date rendue reste la même quel que soit le décalage horaire.
const JUL_26_2026 = Date.UTC(2026, 6, 26, 12, 0, 0) / 1000;
const JAN_05_2025 = Date.UTC(2025, 0, 5, 12, 0, 0) / 1000;
const FEB_29_2024 = Date.UTC(2024, 1, 29, 12, 0, 0) / 1000;

describe("formatShortNewsDate", () => {
  it("rend une date courte en français", () => {
    expect(formatShortNewsDate(JUL_26_2026)).toBe("26 juil. 2026");
  });

  it("n'ajoute pas de zéro devant les jours à un chiffre", () => {
    expect(formatShortNewsDate(JAN_05_2025)).toBe("5 janv. 2025");
  });

  it("gère le 29 février d'une année bissextile", () => {
    expect(formatShortNewsDate(FEB_29_2024)).toBe("29 févr. 2024");
  });

  it("interprète le timestamp Steam en secondes, pas en millisecondes", () => {
    // Un timestamp lu en millisecondes retomberait en 1970.
    expect(formatShortNewsDate(JUL_26_2026)).not.toContain("1970");
  });
});

describe("formatNewsDate", () => {
  it("rend le mois en entier", () => {
    expect(formatNewsDate(JUL_26_2026)).toBe("26 juillet 2026");
  });

  it("conserve les accents du mois", () => {
    expect(formatNewsDate(FEB_29_2024)).toBe("29 février 2024");
  });

  it("diffère du format court sur le mois uniquement", () => {
    expect(formatNewsDate(JAN_05_2025)).toBe("5 janvier 2025");
    expect(formatShortNewsDate(JAN_05_2025)).toBe("5 janv. 2025");
  });
});

describe("formatPatchNotesTitle", () => {
  it("ne garde que la partie avant le séparateur \" - \"", () => {
    expect(formatPatchNotesTitle("Mise à jour - 26 juillet 2026")).toBe(
      "Mise à jour",
    );
  });

  it("coupe au premier séparateur quand il y en a plusieurs", () => {
    expect(formatPatchNotesTitle("Patch - Héros - Équilibrage")).toBe("Patch");
  });

  it("laisse le titre intact sans séparateur", () => {
    expect(formatPatchNotesTitle("Mise à jour majeure")).toBe(
      "Mise à jour majeure",
    );
  });

  it("ne coupe pas sur un tiret sans espaces autour", () => {
    expect(formatPatchNotesTitle("Mid-Season Update")).toBe(
      "Mid-Season Update",
    );
  });

  it("renvoie une chaîne vide pour un titre vide", () => {
    expect(formatPatchNotesTitle("")).toBe("");
  });

  it("retire les échappements Steam devant les crochets de section", () => {
    expect(
      formatPatchNotesTitle("Update - \\[ General ] \\[ Items ] \\[ Heroes ]"),
    ).toBe("Update");
    expect(formatPatchNotesTitle("\\[ General ] \\[ Items ]")).toBe(
      "[ General ] [ Items ]",
    );
  });
});

describe("formatPatchNotesContent", () => {
  it("convertit le BBCode Steam en HTML affichable", () => {
    expect(formatPatchNotesContent("[h2]Héros[/h2][b]Abrams[/b]")).toBe(
      "<h2>Héros</h2><strong>Abrams</strong>",
    );
  });

  it("résout les images Steam vers une URL absolue", () => {
    expect(
      formatPatchNotesContent("[img]{STEAM_CLAN_IMAGE}/1/patch.png[/img]"),
    ).toBe('<img src="https://clan.steamstatic.com/images/1/patch.png">');
  });

  it("convertit les liens en ancres cliquables", () => {
    expect(
      formatPatchNotesContent("[url=https://playdeadlock.com]Site[/url]"),
    ).toContain('<a href="https://playdeadlock.com" target="_blank">Site</a>');
  });

  it("transforme les sauts de ligne en <br>", () => {
    expect(formatPatchNotesContent("une\ndeux")).toBe("une<br>deux");
  });

  it("laisse passer le HTML déjà fourni par Steam", () => {
    expect(formatPatchNotesContent("<p>Déjà en HTML</p>")).toBe(
      "<p>Déjà en HTML</p>",
    );
  });

  it("renvoie une chaîne vide pour un contenu vide", () => {
    expect(formatPatchNotesContent("")).toBe("");
  });

  it("produit du HTML exempt de BBCode sur un contenu mixte", () => {
    const html = formatPatchNotesContent(
      "[h3]Objets[/h3]\n[ml][ul][li]Coup critique corrigé[/li][/ul][/ml]",
    );

    expect(html).toContain("<h3>Objets</h3>");
    expect(html).toContain("<li>Coup critique corrigé</li>");
    expect(html).not.toMatch(/\[\/?(h3|ul|li|ml)\]/i);
  });
});
