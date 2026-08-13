import { describe, expect, it } from "vitest";

import { isSafeInternalPath, safeInternalPath } from "./safe-path";

describe("isSafeInternalPath", () => {
  it("accepte les chemins internes avec query", () => {
    expect(isSafeInternalPath("/")).toBe(true);
    expect(isSafeInternalPath("/profil")).toBe(true);
    expect(isSafeInternalPath("/patch-notes/abc")).toBe(true);
    expect(isSafeInternalPath("/showmatch?jour=2026-08-13")).toBe(true);
    expect(isSafeInternalPath("/acces")).toBe(true);
  });

  it("refuse les redirections protocol-relative et off-site", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(isSafeInternalPath("///evil.com")).toBe(false);
    expect(isSafeInternalPath("/\\evil.com")).toBe(false);
    expect(isSafeInternalPath("/\\\\evil.com")).toBe(false);
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
    expect(isSafeInternalPath("http://evil.com")).toBe(false);
    expect(isSafeInternalPath("//evil.com/phish")).toBe(false);
  });

  it("refuse les caractères de contrôle et les backslash", () => {
    expect(isSafeInternalPath("/\tevil.com")).toBe(false);
    expect(isSafeInternalPath("/foo\\bar")).toBe(false);
    expect(isSafeInternalPath("")).toBe(false);
    expect(isSafeInternalPath("profil")).toBe(false);
  });

  it("ne change pas d'origine une fois résolu comme URL", () => {
    const allowed = ["/", "/profil", "/a?b=1", "/equipes/nouvelle"];
    for (const path of allowed) {
      const resolved = new URL(path, "https://dfr.invalid");
      expect(resolved.origin).toBe("https://dfr.invalid");
      expect(isSafeInternalPath(path)).toBe(true);
    }

    const blocked = ["//evil.com", "///evil.com", "/\\evil.com"];
    for (const path of blocked) {
      const resolved = new URL(path, "https://deadlock-france.fr/acces");
      expect(resolved.origin).not.toBe("https://deadlock-france.fr");
      expect(isSafeInternalPath(path)).toBe(false);
    }
  });
});

describe("safeInternalPath", () => {
  it("retombe sur le fallback si la cible est dangereuse", () => {
    expect(safeInternalPath("//evil.com", "/profil")).toBe("/profil");
    expect(safeInternalPath("/amis", "/profil")).toBe("/amis");
    expect(safeInternalPath(null, "/")).toBe("/");
  });
});
