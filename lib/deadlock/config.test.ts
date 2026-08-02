import { describe, expect, it } from "vitest";

import {
  DEADLOCK_REFERENCE_LANGUAGE,
  getDeadlockIoBaseUrl,
  getDeadlockIoLocale,
} from "./config";
import { DEADLOCK_LANG_ENGLISH, DEADLOCK_LANG_FRENCH } from "./types";

describe("deadlock config", () => {
  it("expose une langue de référence par défaut", () => {
    expect(DEADLOCK_REFERENCE_LANGUAGE).toBe(DEADLOCK_LANG_FRENCH);
  });

  it("mappe la locale deadlock.io", () => {
    expect(getDeadlockIoLocale(DEADLOCK_LANG_FRENCH)).toBe("fr");
    expect(getDeadlockIoLocale(DEADLOCK_LANG_ENGLISH)).toBe("en");
    expect(getDeadlockIoBaseUrl(DEADLOCK_LANG_ENGLISH)).toBe(
      "https://deadlock.io/en",
    );
  });
});
