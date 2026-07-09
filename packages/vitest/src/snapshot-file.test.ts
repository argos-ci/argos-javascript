import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeSnapshotFile } from "./snapshot-file";

describe("writeSnapshotFile", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "argos-vitest-snapshot-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("throws when the name is missing", async () => {
    await expect(writeSnapshotFile("", "content", { root })).rejects.toThrow(
      "name",
    );
  });

  it("writes the snapshot content and metadata to disk", async () => {
    const attachments = await writeSnapshotFile("user", "serialized", { root });

    // One snapshot + its metadata attachment.
    expect(attachments).toHaveLength(2);

    const snapshot = attachments.find((a) => a.path.endsWith(".snapshot.txt"));
    expect(snapshot).toBeDefined();
    expect(snapshot!.path).toBe(join(root, "user.snapshot.txt"));
    expect(snapshot!.contentType).toBe("text/plain");
    expect(await readFile(snapshot!.path, "utf-8")).toBe("serialized");

    // The metadata sidecar attributes the snapshot to this SDK and to Vitest.
    const metadataAttachment = attachments.find((a) =>
      a.path.endsWith(".argos.json"),
    );
    expect(metadataAttachment).toBeDefined();
    const metadata = JSON.parse(
      await readFile(metadataAttachment!.path, "utf-8"),
    );
    expect(metadata.sdk.name).toBe("@argos-ci/vitest");
    expect(metadata.automationLibrary.name).toBe("vitest");
  });

  it("uses the extension to control the file type", async () => {
    const attachments = await writeSnapshotFile("data", '{"a":1}', {
      root,
      extension: ".json",
    });
    const snapshot = attachments.find((a) => a.path.endsWith(".snapshot.json"));
    expect(snapshot).toBeDefined();
    expect(snapshot!.contentType).toBe("application/json");
  });

  it("normalizes an extension without a leading dot", async () => {
    const [snapshot] = await writeSnapshotFile("data", "a: 1", {
      root,
      extension: "yml",
    });
    expect(snapshot!.path).toBe(join(root, "data.snapshot.yml"));
  });

  it("records tags in the metadata", async () => {
    const attachments = await writeSnapshotFile("tagged", "x", {
      root,
      tag: ["a", "b"],
    });
    const metadataAttachment = attachments.find((a) =>
      a.path.endsWith(".argos.json"),
    )!;
    const metadata = JSON.parse(
      await readFile(metadataAttachment.path, "utf-8"),
    );
    expect(metadata.tags).toEqual(["a", "b"]);
  });

  it("sanitizes the name and creates nested directories", async () => {
    const [snapshot] = await writeSnapshotFile("nested/report:v1", "x", {
      root,
    });
    // The subdirectory is created and the reserved character is sanitized.
    expect(snapshot!.path).toBe(join(root, "nested", "report-v1.snapshot.txt"));
    expect(await readFile(snapshot!.path, "utf-8")).toBe("x");
  });
});
