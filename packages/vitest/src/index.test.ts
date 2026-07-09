import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  argosScreenshot,
  argosSnapshot,
  checkIsBrowserEnv,
  checkIsVitestEnv,
} from "./index";

it("detects the Vitest environment", async () => {
  await expect(checkIsVitestEnv()).resolves.toBe(true);
});

it("is not in browser mode when running as a Node unit test", () => {
  expect(checkIsBrowserEnv()).toBe(false);
});

it("exports the argosScreenshot function", () => {
  expect(typeof argosScreenshot).toBe("function");
});

it("exports the argosSnapshot function", () => {
  expect(typeof argosSnapshot).toBe("function");
});

it("requires a name for argosSnapshot", async () => {
  await expect(argosSnapshot("", "content")).rejects.toThrow("name");
});

it("writes a snapshot from a Node test", async () => {
  const root = await mkdtemp(join(tmpdir(), "argos-vitest-index-"));
  try {
    const attachments = await argosSnapshot(
      "node-unit",
      { hello: "world" },
      {
        root,
      },
    );
    // In a Node test it takes the direct-write path and returns the attachments.
    expect(attachments).toHaveLength(2);
    const snapshot = attachments.find((a) => a.path.endsWith(".snapshot.txt"));
    expect(snapshot).toBeDefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
