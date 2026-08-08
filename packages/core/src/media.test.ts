import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMediaRequests } from "../mocks/handlers/createMedia";
import { setupMockServer } from "../mocks/server";
import { uploadMedia } from "./media";

setupMockServer();

const FIXTURES = join(__dirname, "../../../__fixtures__/screenshots");
const IMAGE = join(FIXTURES, "penelope.jpg");

const baseParams = {
  apiBaseUrl: "https://api.argos-ci.dev",
  token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
};

describe("#uploadMedia", () => {
  beforeEach(() => {
    createMediaRequests.length = 0;
  });

  it("uploads a file and returns its share URL and Markdown", async () => {
    const [media] = await uploadMedia({ ...baseParams, files: [IMAGE] });

    expect(media).toMatchObject({
      name: "penelope.jpg",
      contentType: "image/jpeg",
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

  it("suffixes the slug per file, since a slug identifies one media", async () => {
    await uploadMedia({
      ...baseParams,
      files: [IMAGE, IMAGE],
      slug: "pr-42",
    });

    expect(createMediaRequests.map((request) => request.slug)).toEqual([
      "pr-42-1",
      "pr-42-2",
    ]);
  });

  it("keeps a single file's slug unsuffixed", async () => {
    await uploadMedia({ ...baseParams, files: [IMAGE], slug: "pr-42-before" });

    expect(createMediaRequests[0]?.slug).toBe("pr-42-before");
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

  it("rejects --comment without a pull request number", async () => {
    // Nothing to comment on, and failing here is clearer than a 400 from the API.
    await expect(
      uploadMedia({ ...baseParams, files: [IMAGE], comment: true }),
    ).rejects.toThrow(/`prNumber` is required/);
  });

  it("rejects an empty file list", async () => {
    await expect(uploadMedia({ ...baseParams, files: [] })).rejects.toThrow(
      /No files to upload/,
    );
  });
});
