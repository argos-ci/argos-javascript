import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { TestRunner } from "vitest";
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

it("auto-names a snapshot from the current test when no name is given", async () => {
  const root = await mkdtemp(join(tmpdir(), "argos-vitest-auto-"));
  try {
    // No `name`: it is derived from the current test + a per-test counter.
    const first = await argosSnapshot({ hello: "world" }, { root });
    const second = await argosSnapshot({ hello: "again" }, { root });

    const testName = TestRunner.getCurrentTest()?.fullName;
    expect(testName).toBeTruthy();

    const firstSnapshot = first.find((a) => a.path.endsWith(".snapshot.txt"));
    const secondSnapshot = second.find((a) => a.path.endsWith(".snapshot.txt"));
    expect(firstSnapshot).toBeDefined();
    expect(secondSnapshot).toBeDefined();

    // Both are auto-named after the test, with an incrementing counter, so they
    // do not collide. The name is derived from the test title (filesystem-unsafe
    // characters like `>` are sanitized away in the file name).
    expect(firstSnapshot!.path).toContain("auto-names a snapshot");
    expect(firstSnapshot!.path).toContain(" 1.snapshot.txt");
    expect(secondSnapshot!.path).toContain(" 2.snapshot.txt");
    expect(firstSnapshot!.path).not.toBe(secondSnapshot!.path);

    // The value is serialized and written under the auto-generated name.
    expect(await readFile(firstSnapshot!.path, "utf-8")).toContain(
      '"hello": "world"',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("writes a snapshot from a Node test", async () => {
  const root = await mkdtemp(join(tmpdir(), "argos-vitest-index-"));
  try {
    const attachments = await argosSnapshot(
      { hello: "world" },
      { name: "node-unit", root },
    );
    // In a Node test it takes the direct-write path and returns the attachments.
    expect(attachments).toHaveLength(2);
    const snapshot = attachments.find((a) =>
      a.path.endsWith("node-unit.snapshot.txt"),
    );
    expect(snapshot).toBeDefined();

    // The metadata sidecar carries the Vitest test metadata.
    const metadataAttachment = attachments.find((a) =>
      a.path.endsWith(".argos.json"),
    );
    const metadata = JSON.parse(
      await readFile(metadataAttachment!.path, "utf-8"),
    );
    expect(metadata.sdk.name).toBe("@argos-ci/vitest");
    expect(metadata.test.title).toBe("writes a snapshot from a Node test");
    expect(metadata.test.location.file).toContain("src/index.test.ts");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
