import { head, branch, getRepositoryURL } from "./git";
import { describe, it, expect } from "vitest";

describe("#head", () => {
  it("returns the current commit", () => {
    expect(head()).toMatch(/^[0-9a-f]{40}$/);
  });
});

// These tests are just examples to run locally
// Hard to make it work reliably in CI

describe.skip("#branch", () => {
  it("returns the current branch", () => {
    expect(branch()).toBe("main");
  });
});

describe.skip("#getRepositoryURL", () => {
  it("returns the repository URL", () => {
    expect(getRepositoryURL()).toBe(
      "git@github.com:argos-ci/argos-javascript.git",
    );
  });
});
