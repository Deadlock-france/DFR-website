import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { translateToFrench } from "./client";

function translationResponse(text: string, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => ({
      translations: [{ detected_source_language: "EN", text }],
    }),
    text: async () =>
      JSON.stringify({ message: `mock error ${status}` }),
  } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("DEEPL_API_KEY", "test-key");
  // Les échecs sont journalisés volontairement : on garde la sortie de test propre.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function requestBody(callIndex = 0) {
  const init = fetchMock.mock.calls[callIndex][1] as RequestInit;
  return JSON.parse(init.body as string) as {
    text: string[];
    source_lang: string;
    target_lang: string;
    tag_handling: string;
    tag_handling_version: string;
    ignore_tags: string[];
    preserve_formatting: boolean;
  };
}

describe("translateToFrench", () => {
  describe("conditions d'appel", () => {
    it("renvoie null sans clé API et n'appelle pas DeepL", async () => {
      vi.stubEnv("DEEPL_API_KEY", "");

      await expect(translateToFrench("Hello")).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("renvoie null pour un texte vide", async () => {
      await expect(translateToFrench("")).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("renvoie null pour un texte composé d'espaces", async () => {
      await expect(translateToFrench("   \n  ")).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("requête envoyée", () => {
    it("traduit de l'anglais vers le français", async () => {
      fetchMock.mockResolvedValue(translationResponse("Bonjour"));

      await translateToFrench("Hello");

      const body = requestBody();
      expect(body.source_lang).toBe("EN");
      expect(body.target_lang).toBe("FR");
    });

    it("cible l'API DeepL Free en POST authentifié", async () => {
      fetchMock.mockResolvedValue(translationResponse("Bonjour"));

      await translateToFrench("Hello");

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api-free.deepl.com/v2/translate");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: "DeepL-Auth-Key test-key",
      });
    });

    it("active le mode XML v2 en ignorant les marqueurs de balises", async () => {
      fetchMock.mockResolvedValue(translationResponse("Bonjour"));

      await translateToFrench("Hello");

      const body = requestBody();
      expect(body.tag_handling).toBe("xml");
      expect(body.tag_handling_version).toBe("v2");
      expect(body.ignore_tags).toEqual(["x"]);
      expect(body.preserve_formatting).toBe(true);
    });

    it("passe un signal d'abandon", async () => {
      fetchMock.mockResolvedValue(translationResponse("Bonjour"));

      await translateToFrench("Hello");

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("protection du BBCode", () => {
    it("remplace les balises BBCode par des marqueurs avant l'envoi", async () => {
      fetchMock.mockResolvedValue(translationResponse("x"));

      await translateToFrench("[b]Heroes[/b]");

      expect(requestBody().text[0]).toBe('<x id="0"></x>Heroes<x id="1"></x>');
    });

    it("échappe les caractères réservés XML du texte autour des marqueurs", async () => {
      fetchMock.mockResolvedValue(translationResponse("x"));

      await translateToFrench("[b]Damage & healing < 100[/b]");

      // Sans cet échappement, DeepL v2 répond 400 "Tag handling parsing failed".
      expect(requestBody().text[0]).toBe(
        '<x id="0"></x>Damage &amp; healing &lt; 100<x id="1"></x>',
      );
    });

    it("n'échappe pas les marqueurs eux-mêmes", async () => {
      fetchMock.mockResolvedValue(translationResponse("x"));

      await translateToFrench("[b]A[/b]");

      expect(requestBody().text[0]).toContain("<x id=");
      expect(requestBody().text[0]).not.toContain("&lt;x");
    });

    it("retire les \\ Steam avant de protéger, pour ne pas laisser de \\ orphelin", async () => {
      fetchMock.mockResolvedValue(
        translationResponse(
          'Mise à jour - <x id="0"></x> <x id="1"></x> <x id="2"></x>',
        ),
      );

      const result = await translateToFrench(
        "Update - \\[ General ] \\[ Items ] \\[ Heroes ]",
      );

      expect(requestBody().text[0]).toBe(
        'Update - <x id="0"></x> <x id="1"></x> <x id="2"></x>',
      );
      expect(result).toBe("Mise à jour - [ General ] [ Items ] [ Heroes ]");
      expect(result).not.toContain("\\[");
    });

    it("ne soumet pas le jargon protégé à la traduction (ex. matchmaking)", async () => {
      fetchMock.mockResolvedValue(
        translationResponse('Mise à jour <x id="0"></x>'),
      );

      const result = await translateToFrench("Matchmaking update");

      expect(requestBody().text[0]).toBe('<x id="0"></x> update');
      expect(result).toBe("Mise à jour Matchmaking");
    });

    it("protège The Doorman avant Doorman pour ne pas couper le nom", async () => {
      fetchMock.mockResolvedValue(
        translationResponse('Mise à jour <x id="0"></x>'),
      );

      const result = await translateToFrench("The Doorman update");

      expect(requestBody().text[0]).toBe('<x id="0"></x> update');
      expect(result).toBe("Mise à jour The Doorman");
    });

    it("protège les sauts de ligne pour conserver la structure des patch notes", async () => {
      fetchMock.mockResolvedValue(
        translationResponse(
          '<x id="0"></x>MODE STANDARD<x id="1"></x><x id="2"></x>Texte',
        ),
      );

      const result = await translateToFrench("[b]STANDARD MODE[/b]\nText");

      expect(requestBody().text[0]).toBe(
        '<x id="0"></x>STANDARD MODE<x id="1"></x><x id="2"></x>Text',
      );
      expect(result).toBe("[b]MODE STANDARD[/b]\nTexte");
    });

    it("restaure les balises d'origine dans la traduction", async () => {
      fetchMock.mockResolvedValue(
        translationResponse('<x id="0"></x>Héros<x id="1"></x>'),
      );

      await expect(translateToFrench("[b]Heroes[/b]")).resolves.toBe(
        "[b]Héros[/b]",
      );
    });

    it("accepte aussi la forme auto-fermante renvoyée par DeepL", async () => {
      fetchMock.mockResolvedValue(
        translationResponse('<x id="0"/>Héros<x id="1"/>'),
      );

      await expect(translateToFrench("[b]Heroes[/b]")).resolves.toBe(
        "[b]Héros[/b]",
      );
    });

    it("restaure les balises même si DeepL les réordonne", async () => {
      fetchMock.mockResolvedValue(
        translationResponse('<x id="2"></x>B<x id="0"></x>A<x id="1"></x>'),
      );

      const result = await translateToFrench("[b]A[/b][i]");

      expect(result).toBe("[i]B[b]A[/b]");
    });

    it("protège les balises complexes avec attributs", async () => {
      fetchMock.mockResolvedValue(
        translationResponse('<x id="0"></x>Link<x id="1"></x>'),
      );

      const result = await translateToFrench(
        "[url=https://playdeadlock.com]Link[/url]",
      );

      expect(requestBody().text[0]).toBe('<x id="0"></x>Link<x id="1"></x>');
      expect(result).toBe("[url=https://playdeadlock.com]Link[/url]");
    });

    it("déséchappe les entités XML renvoyées par DeepL", async () => {
      fetchMock.mockResolvedValue(
        translationResponse("Dégâts &amp; soins &lt; 100"),
      );

      await expect(translateToFrench("Damage & healing < 100")).resolves.toBe(
        "Dégâts & soins < 100",
      );
    });

    it("supprime un marqueur inconnu plutôt que de le laisser fuiter dans le HTML", async () => {
      fetchMock.mockResolvedValue(translationResponse('Texte<x id="9"></x>'));

      await expect(translateToFrench("[b]Text[/b]")).resolves.toBe("Texte");
    });

    it("laisse intact un texte sans BBCode", async () => {
      fetchMock.mockResolvedValue(translationResponse("Bonjour le monde"));

      await expect(translateToFrench("Hello world")).resolves.toBe(
        "Bonjour le monde",
      );
      expect(requestBody().text[0]).toBe("Hello world");
    });
  });

  describe("gestion des échecs", () => {
    it("renvoie null sur quota dépassé", async () => {
      fetchMock.mockResolvedValue(translationResponse("", false, 456));

      await expect(translateToFrench("Hello")).resolves.toBeNull();
    });

    it("renvoie null sur erreur serveur", async () => {
      fetchMock.mockResolvedValue(translationResponse("", false, 500));

      await expect(translateToFrench("Hello")).resolves.toBeNull();
    });

    it("journalise le corps de réponse DeepL sur erreur HTTP", async () => {
      fetchMock.mockResolvedValue(translationResponse("", false, 400));

      await translateToFrench("Hello");

      expect(console.error).toHaveBeenCalledWith(
        "DeepL API error: 400",
        expect.stringContaining("mock error 400"),
      );
    });

    it("renvoie null quand la réponse ne contient aucune traduction", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ translations: [] }),
        text: async () => "",
      } as Response);

      await expect(translateToFrench("Hello")).resolves.toBeNull();
    });

    it("renvoie null quand le réseau échoue", async () => {
      fetchMock.mockRejectedValue(new Error("network down"));

      await expect(translateToFrench("Hello")).resolves.toBeNull();
    });

    it("renvoie null quand la réponse n'est pas du JSON valide", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("invalid json");
        },
        text: async () => "",
      } as unknown as Response);

      await expect(translateToFrench("Hello")).resolves.toBeNull();
    });

    it("journalise l'échec au lieu de le propager, la traduction reste optionnelle", async () => {
      fetchMock.mockRejectedValue(new Error("boom"));

      await expect(translateToFrench("Hello")).resolves.toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
