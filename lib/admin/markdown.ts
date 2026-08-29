import { Marked, type Tokens } from "marked";
import DOMPurify from "isomorphic-dompurify";

import {
  imageDisplayStyle,
  parseImageAlign,
  publicImageSrc,
} from "@/lib/admin/image-align";

const ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "ul",
];

const ALLOWED_ATTR = [
  "href",
  "title",
  "target",
  "rel",
  "src",
  "alt",
  "width",
  "height",
  "class",
  "style",
];

/** Milkdown ImageBlock encode le ratio de resize dans l’alt (`![0.50](url "légende")`). */
const MILKDOWN_RATIO_ALT = /^\d+(\.\d+)?$/;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderImage(token: Tokens.Image): string {
  const href = token.href ?? "";
  const title = (token.title ?? "").trim();
  const text = (token.text ?? "").trim();
  const align = parseImageAlign(href);
  const src = escapeAttr(publicImageSrc(href));

  const isRatio = MILKDOWN_RATIO_ALT.test(text);
  const ratio = isRatio ? Number(text) : NaN;

  // Légende Milkdown = title ; sinon alt textuel classique.
  const alt = escapeAttr(isRatio ? title : text);
  const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";

  if (isRatio && Number.isFinite(ratio) && ratio > 0) {
    const pct = Math.round(Math.min(Math.max(ratio, 0.05), 1) * 100);
    const style = escapeAttr(imageDisplayStyle(align, pct));
    return `<img src="${src}" alt="${alt}"${titleAttr} class="news-md-img" style="${style}" />`;
  }

  const style = escapeAttr(imageDisplayStyle(align));
  return `<img src="${src}" alt="${alt}"${titleAttr} class="news-md-img" style="${style}" />`;
}

const newsMarked = new Marked();
newsMarked.use({
  gfm: true,
  breaks: false,
  renderer: {
    image: renderImage,
  },
});

/** Markdown → HTML sanitizé pour l’affichage public. */
export function renderNewsMarkdown(markdown: string): string {
  const raw = newsMarked.parse(markdown ?? "", {
    async: false,
  }) as string;

  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // https + chemins relatifs (/assets/…)
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$)|\/)/i,
  });
}
