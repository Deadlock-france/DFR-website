import { describe, expect, it } from "vitest";

import {
  asDiscordSnowflake,
  parseDiscordIdentity,
  pickDiscordIdentity,
} from "./discord-profile-sync";

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

describe("asDiscordSnowflake", () => {
  it("accepte un snowflake Discord", () => {
    expect(asDiscordSnowflake("123456789012345678")).toBe("123456789012345678");
  });

  it("rejette un UUID auth et les chaînes trop courtes", () => {
    expect(asDiscordSnowflake("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBeNull();
    expect(asDiscordSnowflake("123")).toBeNull();
    expect(asDiscordSnowflake("")).toBeNull();
  });
});

describe("pickDiscordIdentity", () => {
  const snowflake = "123456789012345678";

  it("lit le snowflake depuis identity_data, pas depuis user_metadata", () => {
    expect(
      pickDiscordIdentity([
        {
          id: snowflake,
          user_id: "user-1",
          identity_id: "11111111-2222-3333-4444-555555555555",
          provider: "discord",
          identity_data: {
            provider_id: snowflake,
            preferred_username: "kaliqot",
            custom_claims: { global_name: "Julien" },
          },
        },
      ]),
    ).toEqual({
      providerId: snowflake,
      identityData: {
        provider_id: snowflake,
        preferred_username: "kaliqot",
        custom_claims: { global_name: "Julien" },
      },
    });
  });

  it("ignore un UUID dans identity.id", () => {
    expect(
      pickDiscordIdentity([
        {
          id: "11111111-2222-3333-4444-555555555555",
          user_id: "user-1",
          identity_id: "11111111-2222-3333-4444-555555555555",
          provider: "discord",
          identity_data: { sub: "not-a-snowflake" },
        },
      ]),
    ).toBeNull();
  });

  it("ignore les identités non Discord", () => {
    expect(
      pickDiscordIdentity([
        {
          id: snowflake,
          user_id: "user-1",
          identity_id: "11111111-2222-3333-4444-555555555555",
          provider: "email",
          identity_data: { provider_id: snowflake },
        },
      ]),
    ).toBeNull();
  });
});
