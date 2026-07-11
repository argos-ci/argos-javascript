import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserCommandContext } from "vitest/node";

const { writeSnapshotFile } = vi.hoisted(() => ({
  writeSnapshotFile: vi.fn(),
}));

vi.mock("./snapshot-file", () => ({ writeSnapshotFile }));

import { createArgosSnapshotCommand } from "./snapshot-command";

const ctx = {} as BrowserCommandContext;

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
    );
  });
});
