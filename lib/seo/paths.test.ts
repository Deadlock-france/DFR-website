import { describe, expect, it } from "vitest";

import { isNoIndexPath } from "./paths";

describe("isNoIndexPath", () => {
  it("marque les pages compte et auth", () => {
    expect(isNoIndexPath("/profil")).toBe(true);
    expect(isNoIndexPath("/amis")).toBe(true);
    expect(isNoIndexPath("/equipes/nouvelle")).toBe(true);
    expect(isNoIndexPath("/equipes/abc")).toBe(true);
    expect(isNoIndexPath("/acces")).toBe(true);
    expect(isNoIndexPath("/api/account/me")).toBe(true);
    expect(isNoIndexPath("/auth/callback")).toBe(true);
  });

  it("laisse les pages publiques", () => {
    expect(isNoIndexPath("/")).toBe(false);
    expect(isNoIndexPath("/patch-notes")).toBe(false);
    expect(isNoIndexPath("/patch-notes/123")).toBe(false);
    expect(isNoIndexPath("/showmatch")).toBe(false);
    expect(isNoIndexPath("/showmatch/abc")).toBe(false);
  });
});
