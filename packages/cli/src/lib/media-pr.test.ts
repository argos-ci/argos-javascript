import { beforeEach, describe, expect, it, vi } from "vitest";

const { detectPullRequestNumber } = vi.hoisted(() => ({
  detectPullRequestNumber: vi.fn(),
}));

vi.mock("./gh", () => ({ detectPullRequestNumber }));

import { resolveUploadPrNumber } from "./media-pr";

describe("resolveUploadPrNumber", () => {
  beforeEach(() => {
    detectPullRequestNumber.mockReset();
    detectPullRequestNumber.mockResolvedValue(42);
  });

  it("detects the pull request when nothing was passed", async () => {
    // The everyday case: on a branch with a pull request open, uploading a
    // screenshot of what was just changed.
    await expect(resolveUploadPrNumber({})).resolves.toBe(42);
  });

  it("takes an explicit --pr as given, without asking gh", async () => {
    await expect(resolveUploadPrNumber({ pr: "20" })).resolves.toBe(20);
    expect(detectPullRequestNumber).not.toHaveBeenCalled();
  });

  it("attaches to nothing on --no-pr", async () => {
    await expect(resolveUploadPrNumber({ pr: false })).resolves.toBeUndefined();
    expect(detectPullRequestNumber).not.toHaveBeenCalled();
  });

  it("leaves --branch alone", async () => {
    // `--branch` stages the media for whatever pull request opens on it, which
    // is the flow for one that does not exist yet. Detecting over it would
    // publish immediately and discard the staging that was asked for.
    await expect(
      resolveUploadPrNumber({ branch: "feat/checkout" }),
    ).resolves.toBeUndefined();
    expect(detectPullRequestNumber).not.toHaveBeenCalled();
  });

  it("uploads unattached when there is no pull request to find", async () => {
    // No `gh`, not signed in, or none open yet — all the same state, and none of
    // them is a reason to fail an upload.
    detectPullRequestNumber.mockResolvedValue(null);

    await expect(resolveUploadPrNumber({})).resolves.toBeUndefined();
  });
});
