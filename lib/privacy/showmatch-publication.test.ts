import { describe, expect, it } from "vitest";

import {
  SHOWMATCH_PUBLIC_IDENTIFIERS,
  publicPlayerEmbedColumns,
  toPublicShowmatchPlayerRef,
} from "./showmatch-publication";

const SAMPLE = {
  id: "player-1",
  displayName: "Mizara",
  discordUsername: "mizara",
  avatarUrl: "https://cdn.discordapp.com/avatars/99/a.png",
  discordId: "123456789",
  steamId32: "7656119",
};

describe("SHOWMATCH_PUBLIC_IDENTIFIERS", () => {
  it("masque Discord ID, Steam ID et caster ID par défaut", () => {
    expect(SHOWMATCH_PUBLIC_IDENTIFIERS.includeDiscordId).toBe(false);
    expect(SHOWMATCH_PUBLIC_IDENTIFIERS.includeSteamId32).toBe(false);
    expect(SHOWMATCH_PUBLIC_IDENTIFIERS.includeCasterDiscordId).toBe(false);
  });
});

describe("toPublicShowmatchPlayerRef", () => {
  it("conserve le pseudo et omet les identifiants stables", () => {
    expect(toPublicShowmatchPlayerRef(SAMPLE)).toEqual({
      id: "player-1",
      displayName: "Mizara",
      discordUsername: "mizara",
      avatarUrl: SAMPLE.avatarUrl,
    });
  });

  it("réintègre les IDs seulement si les paramètres le demandent", () => {
    expect(
      toPublicShowmatchPlayerRef(SAMPLE, {
        includeDiscordId: true,
        includeSteamId32: true,
        includeCasterDiscordId: false,
      }),
    ).toEqual({
      id: "player-1",
      displayName: "Mizara",
      discordUsername: "mizara",
      avatarUrl: SAMPLE.avatarUrl,
      discordId: "123456789",
      steamId32: "7656119",
    });
  });
});

describe("publicPlayerEmbedColumns", () => {
  it("n’embarque pas discord_id ni steam_id32 par défaut", () => {
    expect(publicPlayerEmbedColumns()).toEqual([
      "id",
      "display_name",
      "discord_username",
      "avatar_url",
    ]);
  });
});
