import { describe, expect, it } from "vitest";

import {
  normalizeAdminUserSearchQuery,
  resolveGrantTarget,
  resolveRevokeTarget,
} from "@/lib/admin/admins";

describe("normalizeAdminUserSearchQuery", () => {
  it("exige au moins 2 caractères utiles", () => {
    expect(normalizeAdminUserSearchQuery("a")).toBeNull();
    expect(normalizeAdminUserSearchQuery("  ab  ")).toBe("ab");
  });

  it("retire les métacaractères ilike / filtres PostgREST", () => {
    expect(normalizeAdminUserSearchQuery("kali,qot")).toBe("kaliqot");
    expect(normalizeAdminUserSearchQuery("a%b_c")).toBe("abc");
    expect(normalizeAdminUserSearchQuery("%_")).toBeNull();
  });
});

describe("resolveGrantTarget", () => {
  it("accepte un snowflake Discord", () => {
    expect(resolveGrantTarget({ discord_id: "243333369235111936" })).toEqual({
      ok: true,
      discordId: "243333369235111936",
    });
  });

  it("refuse un UUID ou une valeur vide", () => {
    expect(
      resolveGrantTarget({
        discord_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toEqual({ ok: false, error: "missing_discord" });
    expect(resolveGrantTarget({ discord_id: null })).toEqual({
      ok: false,
      error: "missing_discord",
    });
  });
});

describe("resolveRevokeTarget", () => {
  it("interdit de retirer le dernier admin actif", () => {
    expect(
      resolveRevokeTarget({
        targetDiscordId: "243333369235111936",
        activeCount: 1,
        targetIsActive: true,
      }),
    ).toEqual({ ok: false, error: "last_admin" });
  });

  it("autorise un retrait s’il reste un autre admin", () => {
    expect(
      resolveRevokeTarget({
        targetDiscordId: "243333369235111936",
        activeCount: 2,
        targetIsActive: true,
      }),
    ).toEqual({ ok: true });
  });

  it("refuse une cible déjà inactive", () => {
    expect(
      resolveRevokeTarget({
        targetDiscordId: "243333369235111936",
        activeCount: 2,
        targetIsActive: false,
      }),
    ).toEqual({ ok: false, error: "not_admin" });
  });
});
