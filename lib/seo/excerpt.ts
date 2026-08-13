import { unescapeSteamBrackets } from "@/lib/steam/text";

const DEFAULT_MAX_LENGTH = 160;

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/** Texte brut pour meta description / Open Graph, à partir de HTML ou BBCode Steam. */
export function plainTextExcerpt(
  input: string,
  maxLength = DEFAULT_MAX_LENGTH,
): string {
  const stripped = decodeBasicEntities(
    unescapeSteamBrackets(input)
      .replace(/\[\/?[^\]]+\]/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  if (stripped.length <= maxLength) return stripped;

  const slice = stripped.slice(0, maxLength + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;
  return `${stripped.slice(0, cut).trimEnd()}…`;
}
