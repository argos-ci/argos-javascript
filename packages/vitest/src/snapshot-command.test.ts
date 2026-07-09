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
    expect(writeSnapshotFile).toHaveBeenCalledWith("user", "serialized", {
      root: "/abs/screenshots",
    });
  });

  it("lets per-call options override the plugin root", async () => {
    const command = createArgosSnapshotCommand({ root: "/abs/screenshots" });
    await command(ctx, "user", "serialized", {
      root: "/other",
      extension: ".json",
      tag: "a",
    });
    expect(writeSnapshotFile).toHaveBeenCalledWith("user", "serialized", {
      root: "/other",
      extension: ".json",
      tag: "a",
    });
  });
});
