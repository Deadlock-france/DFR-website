import { describe, expect, it } from "vitest";

import { unescapeSteamBrackets } from "./text";

describe("unescapeSteamBrackets", () => {
  it("retire les backslashes devant les crochets littéraux Steam", () => {
    expect(unescapeSteamBrackets("\\[ General ] \\[ Items ]")).toBe(
      "[ General ] [ Items ]",
    );
  });

  it("retire aussi l'échappement du crochet fermant", () => {
    expect(unescapeSteamBrackets("\\[ Heroes \\]")).toBe("[ Heroes ]");
  });

  it("laisse intact un titre sans échappement", () => {
    expect(unescapeSteamBrackets("[ General ] [ Items ]")).toBe(
      "[ General ] [ Items ]",
    );
  });

  it("ne touche pas aux autres backslashes", () => {
    expect(unescapeSteamBrackets("path\\to\\file")).toBe("path\\to\\file");
  });

  it("laisse le BBCode réel intact", () => {
    expect(unescapeSteamBrackets("[b]Heroes[/b]")).toBe("[b]Heroes[/b]");
  });
});
