import { describe, expect, it } from "vitest";

import {
  createAdminElevationToken,
  verifyAdminElevationToken,
  verifyAdminUnlockSecret,
} from "@/lib/admin/access";
import {
  parseImageAlign,
  publicImageSrc,
  withImageAlign,
} from "@/lib/admin/image-align";
import { slugifyNewsTitle } from "@/lib/admin/types";
import { renderNewsMarkdown } from "@/lib/admin/markdown";

describe("admin unlock crypto", () => {
  it("refuse un secret vide si ADMIN_UNLOCK_SECRET manquant", () => {
    const prev = process.env.ADMIN_UNLOCK_SECRET;
    delete process.env.ADMIN_UNLOCK_SECRET;
    expect(verifyAdminUnlockSecret("anything")).toBe(false);
    if (prev === undefined) delete process.env.ADMIN_UNLOCK_SECRET;
    else process.env.ADMIN_UNLOCK_SECRET = prev;
  });

  it("vérifie le secret et le token d’élévation liés au discord id", () => {
    const prev = process.env.ADMIN_UNLOCK_SECRET;
    process.env.ADMIN_UNLOCK_SECRET = "test-admin-secret-xyz";
    expect(verifyAdminUnlockSecret("wrong")).toBe(false);
    expect(verifyAdminUnlockSecret("test-admin-secret-xyz")).toBe(true);

    const token = createAdminElevationToken("123456789012345678");
    expect(verifyAdminElevationToken(token, "123456789012345678")).toBe(true);
    expect(verifyAdminElevationToken(token, "999")).toBe(false);
    expect(verifyAdminElevationToken("bogus", "123456789012345678")).toBe(false);

    if (prev === undefined) delete process.env.ADMIN_UNLOCK_SECRET;
    else process.env.ADMIN_UNLOCK_SECRET = prev;
  });
});

describe("slugifyNewsTitle", () => {
  it("normalise accents et espaces", () => {
    expect(slugifyNewsTitle("Événement Showmatch !")).toBe(
      "evenement-showmatch",
    );
  });
});

describe("image align helpers", () => {
  it("parse / with / public src", () => {
    expect(parseImageAlign("https://x.com/a.png")).toBe("left");
    expect(parseImageAlign("https://x.com/a.png#align=center")).toBe("center");
    expect(withImageAlign("https://x.com/a.png", "right")).toBe(
      "https://x.com/a.png#align=right",
    );
    expect(withImageAlign("https://x.com/a.png#align=right", "left")).toBe(
      "https://x.com/a.png",
    );
    expect(publicImageSrc("https://x.com/a.png#align=center")).toBe(
      "https://x.com/a.png",
    );
  });
});

describe("renderNewsMarkdown", () => {
  it("autorise le gras et retire le script", () => {
    const html = renderNewsMarkdown('Hello **world** <script>alert(1)</script>');
    expect(html).toContain("<strong>world</strong>");
    expect(html).not.toContain("<script>");
  });

  it("conserve les images Markdown https", () => {
    const html = renderNewsMarkdown(
      "![Banner](https://example.com/banner.png)",
    );
    expect(html).toContain("<img");
    expect(html).toContain('src="https://example.com/banner.png"');
    expect(html).toContain('alt="Banner"');
  });

  it("applique le ratio Milkdown ImageBlock en largeur", () => {
    const html = renderNewsMarkdown(
      '![0.50](https://example.com/photo.png "Légende")',
    );
    expect(html).toContain('src="https://example.com/photo.png"');
    expect(html).toContain('alt="Légende"');
    expect(html).toContain("width:50%");
    expect(html).toContain("margin-inline:0");
    expect(html).not.toContain('alt="0.50"');
  });

  it("respecte l’alignement #align= dans l’URL", () => {
    const html = renderNewsMarkdown(
      "![0.40](https://example.com/photo.png#align=center)",
    );
    expect(html).toContain('src="https://example.com/photo.png"');
    expect(html).toContain("margin-inline:auto");
    expect(html).toContain("width:40%");
  });
});
