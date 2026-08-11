import { describe, expect, it } from "vitest";

import { parseDiscordIdentity } from "./discord-profile-sync";

describe("parseDiscordIdentity", () => {
  it("préfère custom_claims.global_name au username", () => {
    expect(
      parseDiscordIdentity({
        preferred_username: "kaliqot",
        name: "kaliqot",
        full_name: "kaliqot",
        custom_claims: { global_name: "Julien" },
        avatar_url: "https://cdn.discordapp.com/avatars/1.png",
        provider_id: "123",
      }),
    ).toEqual({
      discord_id: "123",
      username: "kaliqot",
      global_name: "Julien",
      avatar_url: "https://cdn.discordapp.com/avatars/1.png",
    });
  });

  it("retombe sur full_name puis name puis username", () => {
    expect(
      parseDiscordIdentity({
        preferred_username: "kaliqot",
        full_name: "Jules",
      }).global_name,
    ).toBe("Jules");

    expect(
      parseDiscordIdentity({
        preferred_username: "kaliqot",
        name: "Nom Discord",
      }).global_name,
    ).toBe("Nom Discord");

    expect(
      parseDiscordIdentity({
        preferred_username: "kaliqot",
      }).global_name,
    ).toBe("kaliqot");
  });

  it("ignore les chaînes vides dans custom_claims", () => {
    expect(
      parseDiscordIdentity({
        preferred_username: "kaliqot",
        custom_claims: { global_name: "   " },
        full_name: "Julien",
      }).global_name,
    ).toBe("Julien");
  });
});
