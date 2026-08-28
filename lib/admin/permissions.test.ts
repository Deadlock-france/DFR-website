import { describe, expect, it } from "vitest";

import {
  canDeleteRole,
  expandPermissions,
  hasPermission,
  mergePermissionLists,
  normalizeRoleColor,
  normalizeRoleName,
  sanitizeStoredPermissions,
  slugifyRoleName,
} from "@/lib/admin/permissions";

describe("expandPermissions", () => {
  it("accorde tout avec administrateur", () => {
    const set = expandPermissions(["admin.administrator"]);
    expect(set.has("admin.roles")).toBe(true);
    expect(set.has("site.access")).toBe(true);
    expect(set.has("admin.applications")).toBe(true);
  });

  it("un scope métier implique dashboard et accès site", () => {
    const set = expandPermissions(["admin.applications"]);
    expect(set.has("admin.applications")).toBe(true);
    expect(set.has("admin.access")).toBe(true);
    expect(set.has("site.access")).toBe(true);
    expect(set.has("admin.roles")).toBe(false);
  });

  it("site.access seul n’ouvre pas le dashboard", () => {
    const set = expandPermissions(["site.access"]);
    expect(set.has("site.access")).toBe(true);
    expect(set.has("admin.access")).toBe(false);
  });
});

describe("hasPermission / merge", () => {
  it("unionne plusieurs rôles", () => {
    const set = mergePermissionLists([
      ["admin.applications"],
      ["admin.announcements"],
    ]);
    expect(set.has("admin.applications")).toBe(true);
    expect(set.has("admin.announcements")).toBe(true);
    expect(set.has("admin.access")).toBe(true);
  });

  it("ignore les clés inconnues", () => {
    expect(sanitizeStoredPermissions(["nope", "admin.roles"])).toEqual([
      "admin.roles",
    ]);
    expect(hasPermission(["nope"], "admin.roles")).toBe(false);
  });
});

describe("role name / color", () => {
  it("normalise le nom", () => {
    expect(normalizeRoleName("  Modération  ")).toBe("Modération");
    expect(normalizeRoleName("x")).toBeNull();
  });

  it("valide une couleur hex", () => {
    expect(normalizeRoleColor("#4a9b7f")).toBe("#4A9B7F");
    expect(normalizeRoleColor("green")).toBeNull();
  });

  it("slugifie le nom", () => {
    expect(slugifyRoleName("Modération Staff")).toBe("moderation-staff");
  });

  it("interdit de supprimer un rôle système", () => {
    expect(canDeleteRole({ isSystem: true })).toBe(false);
    expect(canDeleteRole({ isSystem: false })).toBe(true);
  });
});
