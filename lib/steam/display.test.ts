import { describe, expect, it } from "vitest";

import { DEADLOCK_LANG_ENGLISH, DEADLOCK_LANG_FRENCH } from "@/lib/deadlock/types";

import {
  getPatchNoteDisplay,
  hasPatchNoteOriginal,
  isPatchNoteEnglishAvailable,
} from "./display";
import type { SteamNewsItem } from "./types";

function item(overrides: Partial<SteamNewsItem> = {}): SteamNewsItem {
  return {
    gid: "news-1",
    title: "Mise à jour",
    url: "https://example.com",
    is_external_url: true,
    author: "Valve",
    contents: "[b]Héros[/b] rééquilibrés",
    feedlabel: "Community Announcements",
    date: 1_785_067_200,
    feedname: "steam_community_announcements",
    feed_type: 1,
    appid: 1422450,
    original: {
      title: "Update",
      contents: "[b]Heroes[/b] rebalanced",
    },
    ...overrides,
  };
}

describe("getPatchNoteDisplay", () => {
  it("retourne la version française par défaut", () => {
    expect(getPatchNoteDisplay(item(), DEADLOCK_LANG_FRENCH)).toEqual({
      title: "Mise à jour",
      contents: "[b]Héros[/b] rééquilibrés",
    });
  });

  it("retourne la VO anglaise quand demandée", () => {
    expect(getPatchNoteDisplay(item(), DEADLOCK_LANG_ENGLISH)).toEqual({
      title: "Update",
      contents: "[b]Heroes[/b] rebalanced",
    });
  });

  it("retombe sur le français si la VO est absente", () => {
    const patchNote = item({ original: undefined });

    expect(getPatchNoteDisplay(patchNote, DEADLOCK_LANG_ENGLISH)).toEqual({
      title: "Mise à jour",
      contents: "[b]Héros[/b] rééquilibrés",
    });
  });
});

describe("isPatchNoteEnglishAvailable", () => {
  it("détecte quand la VO diffère de la version française", () => {
    expect(isPatchNoteEnglishAvailable(item())).toBe(true);
  });

  it("retourne false si les deux versions sont identiques", () => {
    expect(
      isPatchNoteEnglishAvailable(
        item({
          original: {
            title: "Mise à jour",
            contents: "[b]Héros[/b] rééquilibrés",
          },
        }),
      ),
    ).toBe(false);
  });

  it("retourne false sans original", () => {
    expect(isPatchNoteEnglishAvailable(item({ original: undefined }))).toBe(false);
    expect(hasPatchNoteOriginal(item({ original: undefined }))).toBe(false);
  });
});
