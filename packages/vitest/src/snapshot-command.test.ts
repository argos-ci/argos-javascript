import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserCommandContext } from "vitest/node";

const { writeSnapshotFile } = vi.hoisted(() => ({
  writeSnapshotFile: vi.fn(),
}));

vi.mock("./snapshot-file", () => ({ writeSnapshotFile }));

import { createArgosSnapshotCommand } from "./snapshot-command";

/** Context of a command run by the project of a `browser.instances` entry. */
function createCtx(browserName: string): BrowserCommandContext {
  return {
    project: { config: { browser: { name: browserName } } },
  } as unknown as BrowserCommandContext;
}

const ctx = createCtx("chromium");

describe("createArgosSnapshotCommand", () => {
  beforeEach(() => {
    writeSnapshotFile.mockReset().mockResolvedValue([]);
  });

  it("throws when the name is missing", async () => {
    const command = createArgosSnapshotCommand();
    await expect(command(ctx, "", "content")).rejects.toThrow("name");
  });

  it("writes the serialized content with the plugin root", async () => {
    const command = createArgosSnapshotCommand({ root: "/abs/screenshots" });
    await command(ctx, "user", "serialized");
    expect(writeSnapshotFile).toHaveBeenCalledWith(
      "user",
      "serialized",
      { root: "/abs/screenshots" },
      undefined,
      undefined,
      undefined,
    );
  });

  it("lets per-call options override the plugin root", async () => {
    const command = createArgosSnapshotCommand({ root: "/abs/screenshots" });
    await command(ctx, "user", "serialized", {
      root: "/other",
      extension: ".json",
      tag: "a",
    });
    expect(writeSnapshotFile).toHaveBeenCalledWith(
      "user",
      "serialized",
      { root: "/other", extension: ".json", tag: "a" },
      undefined,
      undefined,
      undefined,
    );
  });

  it("forwards the test metadata to the writer", async () => {
    const command = createArgosSnapshotCommand({ root: "/abs/screenshots" });
    const test = {
      id: "1_0_0",
      title: "user",
      titlePath: ["src/user.test.ts", "user"],
      location: { file: "/abs/src/user.test.ts", line: 1, column: 1 },
    };
    await command(ctx, "user", "serialized", undefined, test);
    expect(writeSnapshotFile).toHaveBeenCalledWith(
      "user",
      "serialized",
      { root: "/abs/screenshots" },
      test,
      undefined,
      undefined,
    );
  });

  it("forwards the capture index to the writer", async () => {
    const command = createArgosSnapshotCommand({ root: "/abs/screenshots" });
    await command(ctx, "user", "serialized", undefined, undefined, 2);
    expect(writeSnapshotFile).toHaveBeenCalledWith(
      "user",
      "serialized",
      { root: "/abs/screenshots" },
      undefined,
      2,
      undefined,
    );
  });

  it("forwards the Storybook context to the writer", async () => {
    const command = createArgosSnapshotCommand({ root: "/abs/screenshots" });
    const storybook = { source: "portable-stories" as const, story: null };
    await command(ctx, "user", "serialized", undefined, null, 0, storybook);
    expect(writeSnapshotFile).toHaveBeenCalledWith(
      "user",
      "serialized",
      { root: "/abs/screenshots" },
      null,
      0,
      storybook,
    );
  });

  it("adds the browser to the name outside Chromium", async () => {
    const command = createArgosSnapshotCommand({ root: "/abs/screenshots" });
    await command(createCtx("firefox"), "user", "serialized");
    expect(writeSnapshotFile).toHaveBeenCalledWith(
      "user browser-[firefox]",
      "serialized",
      { root: "/abs/screenshots" },
      undefined,
      undefined,
      undefined,
    );
  });
});
