import { copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMediaRequests } from "../mocks/handlers/createMedia";
import { setupMockServer } from "../mocks/server";
import { uploadMedia } from "./media";

setupMockServer();

const FIXTURES = join(__dirname, "../../../__fixtures__/screenshots");
const IMAGE = join(FIXTURES, "penelope.jpg");
const PNG = join(FIXTURES, "penelope.png");

const baseParams = {
  apiBaseUrl: "https://api.argos-ci.dev",
  token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
};

/** Copy the PNG fixture under each name, for the cases about naming. */
async function stageFiles(names: string[]): Promise<string[]> {
  const dir = await mkdtemp(join(tmpdir(), "argos-media-"));
  const paths = names.map((name) => join(dir, name));
  await Promise.all(paths.map((path) => copyFile(PNG, path)));
  return paths;
}

describe("#uploadMedia", () => {
  beforeEach(() => {
    createMediaRequests.length = 0;
  });

  it("uploads a file and returns its share URL and Markdown", async () => {
    const [media] = await uploadMedia({ ...baseParams, files: [IMAGE] });

    expect(media).toMatchObject({
      name: "penelope.jpg",
      url: "https://app.argos-ci.dev/m/share-token",
      markdown: "![penelope.jpg](https://app.argos-ci.dev/m/share-token)",
    });
  });

  it("sends the file's real size and hash so the key is content-addressed", async () => {
    await uploadMedia({ ...baseParams, files: [IMAGE] });

    const [request] = createMediaRequests;
    expect(request?.size).toBeGreaterThan(0);
    expect(request?.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("converts an image to WebP, and declares the bytes it actually sends", async () => {
    await uploadMedia({ ...baseParams, files: [PNG] });

    const [request] = createMediaRequests;
    expect(request?.contentType).toBe("image/webp");
    // The name keeps the caller's extension: it is the media's identity, and it
    // must not move because Argos changed how it compresses.
    expect(request?.name).toBe("penelope.png");
    // Cheap proof it is the converted file and not the original 252 KB PNG.
    expect(request?.size).toBeLessThan(100_000);
  });

  it("uploads the file untouched with compress disabled", async () => {
    await uploadMedia({ ...baseParams, files: [PNG], compress: false });

    expect(createMediaRequests[0]?.contentType).toBe("image/png");
  });

  it("lifts a before/after suffix off the file name, so a pair shares one", async () => {
    const [before, after] = await stageFiles([
      "checkout-before.png",
      "checkout-after.png",
    ]);

    await uploadMedia({ ...baseParams, files: [before!, after!] });

    expect(
      createMediaRequests.map((request) => [request.name, request.state]),
    ).toEqual([
      ["checkout.png", "before"],
      ["checkout.png", "after"],
    ]);
  });

  it("lets an explicit state replace the one in the name", async () => {
    const [before] = await stageFiles(["checkout-before.png"]);

    await uploadMedia({ ...baseParams, files: [before!], state: "after" });

    // The suffix still comes off the name — it was never part of it.
    expect(createMediaRequests[0]).toMatchObject({
      name: "checkout.png",
      state: "after",
    });
  });

  it("sends the pull request, branch and description it was given", async () => {
    await uploadMedia({
      ...baseParams,
      files: [IMAGE],
      branch: "feat/checkout",
      prNumber: 1234,
      description: "Checkout after the fix.",
    });

    expect(createMediaRequests[0]).toMatchObject({
      branch: "feat/checkout",
      prNumber: 1234,
      description: "Checkout after the fix.",
    });
  });

  it("rejects a file type Argos does not accept, before uploading anything", async () => {
    await expect(
      uploadMedia({
        ...baseParams,
        files: [join(FIXTURES, "aria.snapshot.yml")],
      }),
    ).rejects.toThrow(/Unsupported file type/);

    expect(createMediaRequests).toHaveLength(0);
  });

  it("refuses a batch where one file would replace another", async () => {
    // Both resolve to `penelope.jpg` as the after, so the second upload would
    // become a new version of the first and only one would survive.
    await expect(
      uploadMedia({ ...baseParams, files: [IMAGE, IMAGE], state: "after" }),
    ).rejects.toThrow(/would both upload as "penelope.jpg" \(after\)/);

    expect(createMediaRequests).toHaveLength(0);
  });

  it("rejects an empty file list", async () => {
    await expect(uploadMedia({ ...baseParams, files: [] })).rejects.toThrow(
      /No files to upload/,
    );
  });
});
