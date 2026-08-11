import { describe, expect, it } from "vitest";

import { getSupabaseAnonKey, hasAuthCookies } from "./env";

describe("hasAuthCookies", () => {
  it("détecte un cookie auth Supabase", () => {
    expect(
      hasAuthCookies([
        { name: "sb-xxx-auth-token", value: "abc" },
        { name: "other", value: "1" },
      ]),
    ).toBe(true);
  });

  it("ignore les cookies non-auth", () => {
    expect(hasAuthCookies([{ name: "theme", value: "dark" }])).toBe(false);
    expect(hasAuthCookies([{ name: "sb-xxx-auth-token", value: "" }])).toBe(
      false,
    );
  });
});

describe("getSupabaseAnonKey", () => {
  it("refuse une clé secret exposée en public", () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_secret_should_fail";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => getSupabaseAnonKey()).toThrow(/anon\/publishable/);

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prev;
  });
});
