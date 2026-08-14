import { describe, expect, it } from "vitest";

import { parseStreamChannel } from "./stream-channel";

describe("parseStreamChannel", () => {
  it("extrait le login Twitch", () => {
    expect(parseStreamChannel("https://twitch.tv/deadlockfrance")).toEqual({
      url: "https://twitch.tv/deadlockfrance",
      label: "deadlockfrance",
      platform: "twitch",
    });
    expect(parseStreamChannel("https://www.twitch.tv/DeadlockFrance/")).toEqual({
      url: "https://www.twitch.tv/DeadlockFrance/",
      label: "DeadlockFrance",
      platform: "twitch",
    });
  });

  it("gère YouTube et les URLs inconnues", () => {
    expect(parseStreamChannel("https://youtube.com/watch?v=abc").platform).toBe(
      "youtube",
    );
    expect(parseStreamChannel("https://example.com/live").label).toBe("Stream");
  });
});
