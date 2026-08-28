import { describe, expect, it } from "vitest";

import { STEAM64_BASE, toSteamAccountId } from "./steam-id";

describe("toSteamAccountId", () => {
  it("accepte un SteamID32", () => {
    expect(toSteamAccountId("18136862")).toBe(18136862);
    expect(toSteamAccountId(760106683)).toBe(760106683);
  });

  it("convertit un SteamID64", () => {
    const accountId = BigInt(18136862);
    const steam64 = STEAM64_BASE + accountId;
    expect(toSteamAccountId(steam64.toString())).toBe(18136862);
  });

  it("rejette les valeurs vides ou hors plage", () => {
    expect(toSteamAccountId(null)).toBeNull();
    expect(toSteamAccountId("")).toBeNull();
    expect(toSteamAccountId("abc")).toBeNull();
    expect(toSteamAccountId("0")).toBeNull();
    expect(toSteamAccountId("-12")).toBeNull();
  });
});
