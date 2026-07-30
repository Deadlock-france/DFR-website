import { bbcodeToHtml } from "./bbcode-to-html";
import { unescapeSteamBrackets } from "@/lib/steam/text";

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function formatPatchNotesContent(content: string): string {
    content = unescapeSteamBrackets(content);
    // CAS 1 : Si c'est du HTML (ex: <p>, <img>)
    let result = "";
    if (/<[a-z][\s\S]*>/i.test(content)) {
      const paragraphs = [...content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((match) => decodeHtmlEntities(stripHtmlTags(match[1])))
        .filter((text) => text.length > 0);

      if (paragraphs.length > 0) {
        result = paragraphs.join("\n\n");
      }

      result = decodeHtmlEntities(stripHtmlTags(content));
    }
  
    // CAS 2 : Si c'est du BBCode Steam (ex: [h3], [i], [img], [url])
    if (/\[(i|h[1-6]|img|url|b|u)\]/i.test(content)) {
      result = content
        // Supprime les images [img]...[/img]
        .replace(/\[img\][\s\S]*?\[\/img\]/gi, "")
        // Convertit les liens [url=link]texte[/url] en simple "texte"
        .replace(/\[url=[^\]]+\](.*?)\[\/url\]/gi, "$1")
        // Nettoie les balises de style/titres [h3], [i], [b], etc.
        .replace(/\[\/?(h[1-6]|i|b|u|code|quote|list|\*)\]/gi, "")
        // Supprime les lignes vides multiples générées par la suppression d'images
        .replace(/\n\s*\n/g, "\n\n")
        .trim();
    }
    // CAS 3 : Si c'est le format personnalisé avec [p]
    result = bbcodeToHtml(content)
    return result
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