import { describe, expect, it } from "vitest";
import { hasPlay, mergeTags } from "./story";

describe("mergeTags", () => {
  it("merges the tags of every source, deduplicated", () => {
    expect(mergeTags(["dev", "button"], "button", undefined, ["", 1])).toEqual([
      "dev",
      "button",
    ]);
  });
});

describe("hasPlay", () => {
  it("reads the play function of a composed story", () => {
    const story = Object.assign(() => null, { play: async () => {} });
    expect(hasPlay(story)).toBe(true);
    expect(hasPlay(() => null)).toBe(false);
  });

  it("reads the play function of a story context", () => {
    expect(hasPlay({ playFunction: async () => {} })).toBe(true);
    expect(hasPlay({ playFunction: undefined })).toBe(false);
    expect(hasPlay(null)).toBe(false);
  });
});
