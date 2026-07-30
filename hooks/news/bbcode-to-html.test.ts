import { describe, expect, it } from "vitest";

import { bbcodeToHtml } from "./bbcode-to-html";

describe("bbcodeToHtml", () => {
  describe("placeholders d'images Steam", () => {
    it("résout {STEAM_CLAN_IMAGE} vers le CDN Steam", () => {
      const html = bbcodeToHtml("[img]{STEAM_CLAN_IMAGE}/123/abc.png[/img]");

      expect(html).toBe(
        '<img src="https://clan.steamstatic.com/images/123/abc.png">',
      );
    });

    it("résout aussi la variante localisée {STEAM_CLAN_LOC_IMAGE}", () => {
      const html = bbcodeToHtml("{STEAM_CLAN_LOC_IMAGE}/fr/banner.jpg");

      expect(html).toBe("https://clan.steamstatic.com/images/fr/banner.jpg");
    });

    it("ne laisse aucun placeholder qui serait interprété comme chemin relatif", () => {
      const html = bbcodeToHtml(
        "[img]{STEAM_CLAN_IMAGE}/a.png[/img] [img]{STEAM_CLAN_IMAGE}/b.png[/img]",
      );

      expect(html).not.toContain("{STEAM_CLAN");
    });
  });

  describe("mise en forme du texte", () => {
    it("convertit gras, italique, souligné et barré", () => {
      expect(bbcodeToHtml("[b]gras[/b]")).toBe("<strong>gras</strong>");
      expect(bbcodeToHtml("[i]italique[/i]")).toBe("<em>italique</em>");
      expect(bbcodeToHtml("[u]souligné[/u]")).toBe("<u>souligné</u>");
      expect(bbcodeToHtml("[s]barré[/s]")).toBe("<s>barré</s>");
    });

    it("convertit les titres [h1] à [h4]", () => {
      expect(bbcodeToHtml("[h1]Titre[/h1]")).toBe("<h1>Titre</h1>");
      expect(bbcodeToHtml("[h3]Sous-titre[/h3]")).toBe("<h3>Sous-titre</h3>");
    });

    it("convertit citations et blocs de code", () => {
      expect(bbcodeToHtml("[quote]cité[/quote]")).toBe(
        "<blockquote>cité</blockquote>",
      );
      expect(bbcodeToHtml("[code]x = 1[/code]")).toBe("<pre>x = 1</pre>");
    });

    it("supporte l'imbrication de plusieurs balises", () => {
      expect(bbcodeToHtml("[b][i]les deux[/i][/b]")).toBe(
        "<strong><em>les deux</em></strong>",
      );
    });

    it("est insensible à la casse des balises", () => {
      expect(bbcodeToHtml("[B]gras[/B]")).toBe("<strong>gras</strong>");
    });
  });

  describe("tailles de police", () => {
    it("réduit les tailles 1 et 2", () => {
      expect(bbcodeToHtml("[size=1]petit[/size]")).toBe(
        '<span style="font-size: 0.75em;">petit</span>',
      );
      expect(bbcodeToHtml("[size=2]petit[/size]")).toBe(
        '<span style="font-size: 0.75em;">petit</span>',
      );
    });

    it("laisse la taille 3 sans habillage, c'est la taille de base", () => {
      expect(bbcodeToHtml("[size=3]normal[/size]")).toBe("normal");
    });

    it("agrandit les tailles 4 à 7", () => {
      expect(bbcodeToHtml("[size=4]grand[/size]")).toBe(
        '<span style="font-size: 1.5em;">grand</span>',
      );
      expect(bbcodeToHtml("[size=7]énorme[/size]")).toBe(
        '<span style="font-size: 2em;">énorme</span>',
      );
    });
  });

  describe("couleurs et surlignage", () => {
    it("convertit [color] en style inline", () => {
      expect(bbcodeToHtml("[color=#ff0000]rouge[/color]")).toBe(
        '<span style="color:#ff0000;">rouge</span>',
      );
    });

    it("convertit [highlight] en couleur de fond", () => {
      expect(bbcodeToHtml("[highlight=yellow]surligné[/highlight]")).toBe(
        '<span style="background-color:yellow;">surligné</span>',
      );
    });

    it("retire [font] en conservant le contenu", () => {
      expect(bbcodeToHtml('[font="Arial"]texte[/font]')).toBe("texte");
    });
  });

  describe("liens et médias", () => {
    it("ouvre les liens dans un nouvel onglet", () => {
      expect(bbcodeToHtml("[url=https://exemple.fr]Exemple[/url]")).toBe(
        '<a href="https://exemple.fr" target="_blank">Exemple</a>',
      );
    });

    it("convertit les images avec largeur explicite", () => {
      expect(bbcodeToHtml("[img width=600]https://x.fr/i.png[/img]")).toBe(
        '<img src="https://x.fr/i.png" width="600">',
      );
    });

    it("supporte la syntaxe [img src=\"...\"] sans balise fermante", () => {
      expect(bbcodeToHtml('[img src="https://x.fr/i.png"]')).toBe(
        '<img src="https://x.fr/i.png">',
      );
    });

    it("transforme [youtube] en iframe d'embed", () => {
      expect(bbcodeToHtml("[youtube]dQw4w9WgXcQ[/youtube]")).toBe(
        '<iframe frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/dQw4w9WgXcQ?showinfo=0"></iframe>',
      );
    });

    it("transforme [video] en iframe pointant vers l'URL fournie", () => {
      expect(bbcodeToHtml("[video]https://x.fr/v.mp4[/video]")).toBe(
        '<iframe frameborder="0" allowfullscreen="true" src="https://x.fr/v.mp4"></iframe>',
      );
    });
  });

  describe("listes", () => {
    it("convertit une liste à puces Steam en <ul>", () => {
      expect(bbcodeToHtml("[ml][ul][li]un[/li][li]deux[/li][/ul][/ml]")).toBe(
        "<ul><li>un</li><li>deux</li></ul>",
      );
    });

    it("convertit une liste ordonnée Steam en <ol>", () => {
      expect(bbcodeToHtml("[ml][ol][li]un[/li][/ol][/ml]")).toBe(
        "<ol><li>un</li></ol>",
      );
    });

    it("applique l'indentation des items en em", () => {
      expect(bbcodeToHtml("[li indent=2 align=left]décalé[/li]")).toBe(
        '<li style="margin-left: 4em;">décalé</li>',
      );
    });

    it("n'ajoute aucun style pour un item sans indentation ni alignement", () => {
      expect(bbcodeToHtml("[li indent=0 align=left]simple[/li]")).toBe(
        "<li>simple</li>",
      );
    });

    it("combine indentation et alignement", () => {
      expect(bbcodeToHtml("[li indent=1 align=center]centré[/li]")).toBe(
        '<li style="margin-left: 2em; text-align: center;">centré</li>',
      );
    });
  });

  describe("alignement et indentation", () => {
    it("convertit un bloc centré en paragraphe centré", () => {
      expect(bbcodeToHtml("[center]centré[/center]")).toBe(
        '<p style="text-align: center;">centré</p>',
      );
    });

    it("porte l'alignement sur le titre plutôt que sur un paragraphe englobant", () => {
      expect(bbcodeToHtml("[center][h2]Titre[/h2][/center]")).toBe(
        '<h2 style="text-align: center;">Titre</h2>',
      );
    });

    it("convertit une indentation en marge gauche", () => {
      expect(bbcodeToHtml("[indent data=3]décalé[/indent]")).toBe(
        '<p style="margin-left: 6em;">décalé</p>',
      );
    });

    it("supprime les [left] qui correspondent au défaut", () => {
      expect(bbcodeToHtml("[left]texte[/left]")).toBe("texte");
    });

    it("supprime les séparateurs [hr] qui n'ont pas d'équivalent", () => {
      expect(bbcodeToHtml("avant[hr]après")).toBe("avantaprès");
    });
  });

  describe("sauts de ligne", () => {
    it("convertit les retours à la ligne restants en <br>", () => {
      expect(bbcodeToHtml("ligne 1\nligne 2")).toBe("ligne 1<br>ligne 2");
    });

    it("ne laisse pas de <br> parasite après un titre", () => {
      expect(bbcodeToHtml("[h1]Titre[/h1]\nsuite")).toBe(
        "<h1>Titre</h1>suite",
      );
    });
  });

  describe("robustesse", () => {
    it("renvoie une chaîne vide inchangée", () => {
      expect(bbcodeToHtml("")).toBe("");
    });

    it("laisse le texte brut intact", () => {
      expect(bbcodeToHtml("Juste du texte.")).toBe("Juste du texte.");
    });

    it("n'invente pas de balise sur du BBCode inconnu", () => {
      expect(bbcodeToHtml("[inconnu]texte[/inconnu]")).toBe(
        "[inconnu]texte[/inconnu]",
      );
    });

    it("traite un patch note réaliste sans laisser de BBCode résiduel", () => {
      const patchNote = [
        "[h2]Mise à jour du 26 juillet[/h2]",
        "[b]Héros[/b]",
        "[ml][ul][li]Abrams : dégâts réduits[/li][li]Bebop : portée augmentée[/li][/ul][/ml]",
        "[img]{STEAM_CLAN_IMAGE}/44927624/patch.png[/img]",
        "[url=https://forums.playdeadlock.com]Discussion[/url]",
      ].join("\n");

      const html = bbcodeToHtml(patchNote);

      expect(html).toContain("<h2>Mise à jour du 26 juillet</h2>");
      expect(html).toContain("<strong>Héros</strong>");
      expect(html).toContain("<li>Abrams : dégâts réduits</li>");
      expect(html).toContain(
        '<img src="https://clan.steamstatic.com/images/44927624/patch.png">',
      );
      expect(html).toContain('target="_blank"');
      expect(html).not.toMatch(/\[\/?(h2|b|ul|li|img|url|ml)\b/i);
    });
  });
});
