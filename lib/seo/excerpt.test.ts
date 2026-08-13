import { describe, expect, it } from "vitest";

import { plainTextExcerpt } from "./excerpt";

describe("plainTextExcerpt", () => {
  it("retire le HTML", () => {
    expect(plainTextExcerpt("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("retire le BBCode Steam", () => {
    expect(plainTextExcerpt("[b]Update[/b] [list][*]fix[/list]")).toBe(
      "Update fix",
    );
  });

  it("décode les entités courantes", () => {
    expect(plainTextExcerpt("A &amp; B &quot;ok&quot;")).toBe('A & B "ok"');
  });

  it("tronque sur un mot sans dépasser la limite", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta";
    const excerpt = plainTextExcerpt(text, 20);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(21);
    expect(excerpt).not.toContain("epsilon");
  });

  it("laisse un texte court intact", () => {
    expect(plainTextExcerpt("Patch 1.2")).toBe("Patch 1.2");
  });
});
