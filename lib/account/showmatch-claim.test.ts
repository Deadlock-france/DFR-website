import { describe, expect, it } from "vitest";

import {
  claimShowmatchPlayerByNickname,
  linkDiscordShowmatchPlayer,
} from "./showmatch-claim";

describe("linkDiscordShowmatchPlayer", () => {
  it("refuse un identifiant qui n’est pas un snowflake Discord", async () => {
    await expect(
      linkDiscordShowmatchPlayer({
        userId: "11111111-2222-3333-4444-555555555555",
        providerId: "11111111-2222-3333-4444-555555555555",
      }),
    ).resolves.toBeNull();
  });
});

describe("claimShowmatchPlayerByNickname", () => {
  it("refuse le claim first-come par pseudo", async () => {
    await expect(
      claimShowmatchPlayerByNickname(
        "11111111-2222-3333-4444-555555555555",
        "Mizara34",
      ),
    ).rejects.toThrow("claim_disabled");
  });
});
