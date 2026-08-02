import { bbcodeToHtml } from "./bbcode-to-html";
import { unescapeSteamBrackets } from "@/lib/steam/text";

/**
 * Affinage post-BBCode / HTML Steam : titres de section, images cadrées,
 * un seul <br> d'affilée.
 */
function polishPatchNotesHtml(html: string): string {
  let result = html;

  // Steam HTML officiel utilise souvent <b> plutôt que <strong>.
  result = result.replace(/<b>/gi, "<strong>").replace(/<\/b>/gi, "</strong>");

  // [p][b]Titre[/b][/p] → <p><strong>Titre</strong></p>
  result = result.replace(
    /<p>\s*<strong>([^<]+)<\/strong>\s*<\/p>/gi,
    '<h3 class="patch-notes-section">$1</h3>',
  );

  // [b]Titre[/b] seul sur sa ligne → vrai titre de section (pas du gras inline).
  result = result.replace(
    /(?:^|(?:<br\s*\/?>))\s*<strong>([^<]+)<\/strong>\s*(?=<br\s*\/?>|$)/gi,
    (_match, title: string, offset: number) => {
      const heading = `<h3 class="patch-notes-section">${title.trim()}</h3>`;
      return offset === 0 ? heading : `<br>${heading}`;
    },
  );

  // Lignes type "[ General ]" / "[ Héros ]" (souvent non grasées par Valve).
  result = result.replace(
    /(?:^|(?:<br\s*\/?>))\s*(\[[^\]\n]{1,80}\])\s*(?=<br\s*\/?>|$)/g,
    (_match, title: string, offset: number) => {
      const heading = `<h3 class="patch-notes-section">${title.trim()}</h3>`;
      return offset === 0 ? heading : `<br>${heading}`;
    },
  );

  result = result.replace(/<p>\s*<\/p>/gi, "");

  result = result.replace(
    /<img\b([^>]*)>/gi,
    '<figure class="patch-notes-figure"><img$1></figure>',
  );

  // Un seul saut de ligne suffit pour l'aération visuelle.
  result = result.replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>");
  result = result.replace(/^(?:<br\s*\/?>)+|(?:<br\s*\/?>)+$/gi, "");

  return result;
}

/**
 * DeepL peut réintroduire des blancs à l'intérieur des balises [b]…[/b] :
 * on les aplatit avant la conversion HTML pour que le polish reconnaisse
 * les titres de section.
 */
function normalizeBbcodeInlineTags(content: string): string {
  return content.replace(
    /\[(b|i|u|s|h[1-4])\]([\s\S]*?)\[\/\1\]/gi,
    (_match, tag: string, inner: string) => {
      const trimmed = inner.replace(/^\s+|\s+$/g, "").replace(/\s*\n\s*/g, " ");
      return `[${tag}]${trimmed}[/${tag}]`;
    },
  );
}

function formatPatchNotesContent(content: string): string {
  content = unescapeSteamBrackets(content);

  // HTML déjà fourni par Steam (presse / Events FR) sans BBCode restant.
  if (/<[a-z][\s\S]*>/i.test(content) && !/\[[a-z0-9]/i.test(content)) {
    return polishPatchNotesHtml(content);
  }

  return polishPatchNotesHtml(bbcodeToHtml(normalizeBbcodeInlineTags(content)));
}

function formatShortNewsDate(timestamp: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

function formatPatchNotesTitle(title: string): string {
  return unescapeSteamBrackets(title).split(" - ")[0];
}

function formatNewsDate(timestamp: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

export {
  formatPatchNotesContent,
  formatShortNewsDate,
  formatPatchNotesTitle,
  formatNewsDate,
};
