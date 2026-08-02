import { describe, expect, it } from "vitest";

import {
  linkReferencesInHtml,
  buildReferenceUrlsIndex,
  decorateReferenceChangeLines,
} from "./link-content";
import type { DeadlockReference } from "./types";

const references: DeadlockReference[] = [
  {
    kind: "hero",
    id: 1,
    className: "hero_inferno",
    name: "Infernus",
    role: "Enflamme ses adversaires",
    image: "https://example.com/infernus.webp",
  },
  {
    kind: "item",
    id: 2,
    className: "upgrade_clip_size",
    name: "Chargeur\u00a0XL",
    cost: 800,
    itemTier: 1,
    itemSlotType: "weapon",
    image: "https://example.com/clip.webp",
  },
];

describe("linkReferencesInHtml", () => {
  it("entoure un nom d'héros dans du texte brut", () => {
    const html = linkReferencesInHtml("<p>Infernus a été buffé.</p>", [
      {
        ...references[0],
        url: "https://deadlock.io/fr/heroes/infernus",
      },
    ]);

    expect(html).toContain('data-deadlock-ref="hero:1"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain(
      'data-deadlock-url="https://deadlock.io/fr/heroes/infernus"',
    );
    expect(html).toContain('href="https://deadlock.io/fr/heroes/infernus"');
    expect(html).toContain(">Infernus</a>");
  });

  it("ne modifie pas le contenu des balises HTML", () => {
    const html = linkReferencesInHtml(
      '<a href="https://example.com/Infernus">lien</a> et Infernus',
      references,
    );

    expect(html).toContain('href="https://example.com/Infernus"');
    expect(html).toMatch(/>\s*et <span data-deadlock-ref="hero:1"/);
  });

  it("évite les correspondances partielles dans un mot", () => {
    const html = linkReferencesInHtml("<p>Sevenfold n'est pas Seven.</p>", [
      {
        kind: "hero",
        id: 3,
        className: "hero_seven",
        name: "Seven",
      },
    ]);

    expect(html).toContain("Sevenfold");
    expect(html).toContain(">Seven</span>.");
    expect(html).not.toMatch(/<span[^>]*>Sevenfold/);
  });

  it("gère les espaces insécables des items", () => {
    const html = linkReferencesInHtml(
      "<p>Achetez Chargeur XL tôt.</p>",
      references,
    );

    expect(html).toContain('data-deadlock-ref="item:2"');
  });

  it("reconnaît The Doorman comme alias du héros Doorman", () => {
    const html = linkReferencesInHtml("<p>- The Doorman: CD -2s</p>", [
      {
        kind: "hero",
        id: 50,
        className: "hero_doorman",
        name: "Doorman",
        image: "https://example.com/doorman.webp",
      },
    ]);

    expect(html).toContain('data-deadlock-ref="hero:50"');
    expect(html).toContain(">The Doorman</span>");
  });

  it("retourne le HTML inchangé sans références", () => {
    expect(linkReferencesInHtml("<p>Infernus</p>", [])).toBe(
      "<p>Infernus</p>",
    );
  });
});

describe("decorateReferenceChangeLines", () => {
  it("crée une sous-catégorie avec en-tête et changement", () => {
    const linked = linkReferencesInHtml(
      "<p>- Chargeur XL: charge max +10</p>",
      references,
    );
    const html = decorateReferenceChangeLines(linked, references);

    expect(html).toContain('class="patch-notes-entity"');
    expect(html).toContain('data-deadlock-entity="item:2"');
    expect(html).toContain('src="https://example.com/clip.webp"');
    expect(html).toContain('class="patch-notes-entity-title"');
    expect(html).toContain("<li>charge max +10</li>");
    expect(html).not.toContain("- Chargeur XL:");
  });

  it("regroupe les lignes br sous un même en-tête", () => {
    const linked = linkReferencesInHtml(
      "Intro<br>- Infernus: dégâts +5<br>Suite",
      references,
    );
    const html = decorateReferenceChangeLines(linked, references);

    expect(html).toContain('src="https://example.com/infernus.webp"');
    expect(html).toContain("<li>dégâts +5</li>");
    expect(html).toContain("Intro");
    expect(html).toContain("Suite");
  });

  it("n'ajoute pas de sous-catégorie sur une phrase prosaïque", () => {
    const linked = linkReferencesInHtml(
      "<p>Infernus a été légèrement ajusté ce patch.</p>",
      references,
    );
    const html = decorateReferenceChangeLines(linked, references);

    expect(html).not.toContain("patch-notes-entity");
  });

  it("préfère l'objet au héros comme sujet de la ligne", () => {
    const linked = linkReferencesInHtml(
      "<p>- Chargeur XL: meilleur sur Infernus</p>",
      references,
    );
    const html = decorateReferenceChangeLines(linked, references);

    expect(html).toContain('data-deadlock-entity="item:2"');
    expect(html).toContain('src="https://example.com/clip.webp"');
    expect(html).toContain("<li>meilleur sur");
    expect(html).toContain('data-deadlock-ref="hero:1"');
  });

  it("regroupe plusieurs lignes du même héros sous un seul en-tête", () => {
    const linked = linkReferencesInHtml(
      "<p>- Infernus: dégâts +5</p><p>- Infernus: vitesse +2%</p><p>- Infernus: CD -1s</p>",
      references,
    );
    const html = decorateReferenceChangeLines(linked, references);
    const headers = html.match(/patch-notes-entity-header/g) ?? [];
    const items = html.match(/<li>/g) ?? [];

    expect(headers).toHaveLength(1);
    expect(items).toHaveLength(3);
    expect(html).toContain("<li>dégâts +5</li>");
    expect(html).toContain("<li>vitesse +2%</li>");
    expect(html).toContain("<li>CD -1s</li>");
  });

  it("ouvre une nouvelle sous-catégorie quand le sujet change", () => {
    const linked = linkReferencesInHtml(
      "<p>- Infernus: dégâts +5</p><p>- Infernus: CD -1s</p><p>- Chargeur XL: charge +10</p>",
      references,
    );
    const html = decorateReferenceChangeLines(linked, references);
    const entities = html.match(/patch-notes-entity"/g) ?? [];

    expect(entities).toHaveLength(2);
    expect(html).toContain('data-deadlock-entity="hero:1"');
    expect(html).toContain('data-deadlock-entity="item:2"');
  });

  it("en VF utilise [Alphonse/Doorman] comme titre Alphonse / Doorman", () => {
    const doorman: DeadlockReference = {
      kind: "hero",
      id: 69,
      className: "hero_doorman",
      name: "Alphonse",
      aliases: ["The Doorman", "Doorman"],
      image: "https://example.com/doorman.webp",
    };
    const linked = linkReferencesInHtml(
      "<p>[Alphonse/Doorman] Dégâts balistiques : 24 + 1,25</p><p>[Alphonse/Doorman] Sonnette : 7 s</p>",
      [doorman],
    );
    const html = decorateReferenceChangeLines(linked, [doorman], "french");

    expect(html).toContain(">Alphonse / Doorman</span>");
    expect(html.match(/patch-notes-entity-header/g)).toHaveLength(1);
    expect(html).toContain("<li>Dégâts balistiques : 24 + 1,25</li>");
    expect(html).toContain("<li>Sonnette : 7 s</li>");
    expect(html).not.toContain("/Doorman]");
    expect(html).not.toContain("[Alphonse");
  });

  it("en VF accepte aussi la variante entre parenthèses", () => {
    const nebula: DeadlockReference = {
      kind: "hero",
      id: 11,
      className: "hero_haze",
      name: "Nébula",
      aliases: ["Haze"],
      image: "https://example.com/haze.webp",
    };
    const linked = linkReferencesInHtml(
      "<p>- Nébula (Haze): dégâts +5</p>",
      [nebula],
    );
    const html = decorateReferenceChangeLines(linked, [nebula], "french");

    expect(html).toContain(">Haze</span>");
    expect(html).toContain("<li>dégâts +5</li>");
  });

  it("en VO garde le nom anglais sans logique de parenthèses", () => {
    const linked = linkReferencesInHtml(
      "<p>- Infernus: dégâts +5</p>",
      references,
    );
    const html = decorateReferenceChangeLines(linked, references, "english");

    expect(html).toContain(">Infernus</span>");
    expect(html).toContain("<li>dégâts +5</li>");
  });
});

describe("buildReferenceUrlsIndex", () => {
  it("indexe les URLs VF et VO par référence", () => {
    const index = buildReferenceUrlsIndex({
      french: [
        {
          kind: "item",
          id: 2,
          className: "upgrade_clip_size",
          name: "Chargeur XL",
          url: "https://deadlock.io/fr/items/extended-magazine",
        },
      ],
      english: [
        {
          kind: "item",
          id: 2,
          className: "upgrade_clip_size",
          name: "Extended Magazine",
          url: "https://deadlock.io/en/items/extended-magazine",
        },
      ],
    });

    expect(index.get("item:2")).toEqual({
      french: "https://deadlock.io/fr/items/extended-magazine",
      english: "https://deadlock.io/en/items/extended-magazine",
    });
  });
});
