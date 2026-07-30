import { unescapeSteamBrackets } from "@/lib/steam/text";

const DEEPL_FREE_API = "https://api-free.deepl.com/v2/translate";

type DeepLTranslateResponse = {
  translations: Array<{ detected_source_language: string; text: string }>;
};

/**
 * DeepL v2 parse le payload en XML strict : un `&` ou `<` non échappé dans un
 * patch note Steam déclenche un 400 "Tag handling parsing failed".
 */
function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeXmlText(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Protège les balises BBCode Steam pendant la traduction DeepL : elles sont
 * remplacées par des marqueurs XML que DeepL laisse intact avec tag_handling.
 *
 * Ordre volontaire : d'abord des placeholders hors XML, puis échappement du
 * texte, puis insertion des marqueurs — sinon on échapperait les `<x …>`.
 */
function protectBbcode(text: string): { protectedText: string; tags: string[] } {
  const tags: string[] = [];
  const withPlaceholders = unescapeSteamBrackets(text).replace(/\[[^\]]+\]/g, (tag) => {
    const index = tags.length;
    tags.push(tag);
    return `\0${index}\0`;
  });

  const protectedText = escapeXmlText(withPlaceholders).replace(
    /\0(\d+)\0/g,
    (_match, id) => `<x id="${id}"></x>`,
  );

  return { protectedText, tags };
}

function restoreBbcode(text: string, tags: string[]): string {
  // DeepL peut renvoyer `<x id="N"></x>` ou la forme auto-fermante `<x id="N"/>`.
  const withBbcode = text.replace(
    /<x id="(\d+)"\s*(?:\/>|><\/x>)/gi,
    (_match, id) => tags[Number(id)] ?? "",
  );

  return unescapeXmlText(withBbcode);
}

/**
 * Traduit un texte vers le français via DeepL Free.
 * Retourne null si la clé est absente ou si l'appel échoue.
 */
export async function translateToFrench(
  text: string,
): Promise<string | null> {
  const authKey = process.env.DEEPL_API_KEY;
  if (!authKey || !text.trim()) {
    return null;
  }

  const { protectedText, tags } = protectBbcode(text);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(DEEPL_FREE_API, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `DeepL-Auth-Key ${authKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [protectedText],
        source_lang: "EN",
        target_lang: "FR",
        tag_handling: "xml",
        // Comptes créés après déc. 2025 : v2 par défaut. On le fixe pour que
        // le comportement (XML strict) soit le même partout.
        tag_handling_version: "v2",
        ignore_tags: ["x"],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`DeepL API error: ${response.status}`, detail);
      return null;
    }

    const data = (await response.json()) as DeepLTranslateResponse;
    const translated = data.translations?.[0]?.text;
    if (!translated) return null;

    return restoreBbcode(translated, tags);
  } catch (error) {
    console.error("DeepL translation failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
