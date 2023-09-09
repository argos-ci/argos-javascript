import { head, branch } from "./git";
import { describe, it, expect } from "vitest";

describe("#head", () => {
  it("returns the current commit", () => {
    expect(head()).toMatch(/^[0-9a-f]{40}$/);
  });
});

/**
 * This test can be run locally, too hard to make it work on CI.
 */
describe.skip("#branch", () => {
  it("returns the current branch", () => {
    expect(branch()).toBe("main");
  });
});
