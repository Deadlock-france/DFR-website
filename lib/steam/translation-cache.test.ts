import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCachedDeeplTranslation,
  isCachedTranslationFresh,
  saveDeeplTranslation,
} from "./translation-cache";

const { fromMock, maybeSingleMock, upsertMock, createServiceRoleClient } =
  vi.hoisted(() => {
    const maybeSingleMock = vi.fn();
    const upsertMock = vi.fn();
    const fromMock = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      upsert: upsertMock,
    }));

    return {
      fromMock,
      maybeSingleMock,
      upsertMock,
      createServiceRoleClient: vi.fn(() => ({ from: fromMock })),
    };
  });

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient,
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
  maybeSingleMock.mockReset();
  upsertMock.mockReset();
  fromMock.mockClear();
  createServiceRoleClient.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("isCachedTranslationFresh", () => {
  it("accepte un cache aligné sur la VO Steam actuelle", () => {
    expect(
      isCachedTranslationFresh(
        {
          gid: "1",
          appid: 1422450,
          source_title: "A",
          source_contents: "B",
          title_fr: "a",
          contents_fr: "b",
        },
        { title: "A", contents: "B" },
      ),
    ).toBe(true);
  });

  it("rejette un cache obsolète si Valve a édité le texte", () => {
    expect(
      isCachedTranslationFresh(
        {
          gid: "1",
          appid: 1422450,
          source_title: "A",
          source_contents: "B",
          title_fr: "a",
          contents_fr: "b",
        },
        { title: "A", contents: "B2" },
      ),
    ).toBe(false);
  });
});

describe("getCachedDeeplTranslation", () => {
  it("retourne null sans env Supabase", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(getCachedDeeplTranslation("news-1")).resolves.toBeNull();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("retourne la ligne quand elle existe", async () => {
    const row = {
      gid: "news-1",
      appid: 1422450,
      source_title: "EN",
      source_contents: "body",
      title_fr: "FR",
      contents_fr: "corps",
    };
    maybeSingleMock.mockResolvedValue({ data: row, error: null });

    await expect(getCachedDeeplTranslation("news-1")).resolves.toEqual(row);
  });

  it("retourne null sans faire planter si Supabase échoue", async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { message: "relation missing" },
    });

    await expect(getCachedDeeplTranslation("news-1")).resolves.toBeNull();
  });
});

describe("saveDeeplTranslation", () => {
  it("upsert la traduction", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await saveDeeplTranslation({
      gid: "news-1",
      appid: 1422450,
      source_title: "EN",
      source_contents: "body",
      title_fr: "FR",
      contents_fr: "corps",
    });

    expect(upsertMock).toHaveBeenCalledWith(
      {
        gid: "news-1",
        appid: 1422450,
        source_title: "EN",
        source_contents: "body",
        title_fr: "FR",
        contents_fr: "corps",
        translation_source: "deepl",
      },
      { onConflict: "gid" },
    );
  });

  it("n'explose pas si l'upsert échoue", async () => {
    upsertMock.mockResolvedValue({ error: { message: "permission denied" } });

    await expect(
      saveDeeplTranslation({
        gid: "news-1",
        appid: 1422450,
        source_title: "EN",
        source_contents: "body",
        title_fr: "FR",
        contents_fr: "corps",
      }),
    ).resolves.toBeUndefined();
  });
});
