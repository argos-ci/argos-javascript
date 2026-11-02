import { copyFile, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { createMediaRequests } from "../mocks/handlers/createMedia";
import { server, setupMockServer } from "../mocks/server";
import { uploadMedia } from "./media";

setupMockServer();

const FIXTURES = join(__dirname, "../../../__fixtures__/screenshots");
// Media-only fixtures live inside this package rather than in the repo's shared
// `__fixtures__`: the CLI's e2e uploads that whole directory to Argos as a visual
// test, so a fixture added there turns into a snapshot nobody wants to review.
const MEDIA_FIXTURES = join(__dirname, "../__fixtures__");
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

  it("keeps an animated PNG whole rather than uploading one frame of it", async () => {
    await uploadMedia({
      ...baseParams,
      files: [join(MEDIA_FIXTURES, "animated.png")],
    });

    // Converting reads the first frame only, so an animation would arrive as a
    // still image of something the caller recorded because it moves.
    expect(createMediaRequests[0]?.contentType).toBe("image/png");
  });

  it("uploads the original when the image cannot be converted", async () => {
    // Compression is an optimization: a file Argos would have accepted as-is must
    // not be turned into a failed upload because sharp declined to read it.
    const [broken] = await stageFiles(["broken.png"]);
    await writeFile(broken!, "this is not a PNG");

    await uploadMedia({ ...baseParams, files: [broken!] });

    expect(createMediaRequests[0]?.contentType).toBe("image/png");
  });

  it("leaves no temporary files behind", async () => {
    const before = await readdir(tmpdir());

    await uploadMedia({ ...baseParams, files: [PNG] });

    const after = await readdir(tmpdir());
    const added = after.filter(
      (entry) => !before.includes(entry) && entry.startsWith("argos-media-"),
    );
    expect(added).toEqual([]);
  });

  it("refuses a batch with an unreadable file before uploading any of it", async () => {
    await expect(
      uploadMedia({ ...baseParams, files: [PNG, join(FIXTURES, "typo.png")] }),
    ).rejects.toThrow(/Cannot read file: .*typo\.png/);

    // The whole point: the readable file before it must not already be created,
    // billed and finalized when the batch dies.
    expect(createMediaRequests).toHaveLength(0);
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

describe("#uploadMedia upload path", () => {
  const MULTIPART_URL = "https://api.argos-ci.dev/uploads/multipart";
  let singlePosts: number;
  let multipartParts: number[];

  /**
   * Serve `createMedia` with a multipart target of `partSize`, and count which
   * upload path the SDK took.
   */
  function mockUploadPaths(partSize: number | null) {
    singlePosts = 0;
    multipartParts = [];
    server.use(
      http.post<never, { size: number }>(
        "https://api.argos-ci.dev/media",
        async ({ request }) => {
          const body = await request.json();
          createMediaRequests.push(body as never);
          return HttpResponse.json(
            {
              media: { id: "42", url: "https://app.argos-ci.dev/m/share" },
              upload: {
                url: "https://api.s3.dev/upload/media",
                fields: { "Content-Type": "image/png", policy: "signed" },
                multipart:
                  partSize === null ? null : { url: MULTIPART_URL, partSize },
              },
            },
            { status: 201 },
          );
        },
      ),
      http.post("https://api.s3.dev/upload/*", () => {
        singlePosts += 1;
        return new Response(null, { status: 204 });
      }),
      http.post(MULTIPART_URL, async ({ request }) => {
        const { size } = (await request.json()) as { size: number };
        return HttpResponse.json(
          {
            session: "session",
            partSize: partSize!,
            partCount: Math.ceil(size / partSize!),
            expiresAt: "2026-10-29T12:00:00.000Z",
          },
          { status: 201 },
        );
      }),
      http.put(`${MULTIPART_URL}/parts/:partNumber`, ({ params }) => {
        const partNumber = Number(params["partNumber"]);
        multipartParts.push(partNumber);
        return HttpResponse.json({
          partNumber,
          etag: `"${partNumber}"`,
          checksumCRC32: null,
        });
      }),
      http.post(
        `${MULTIPART_URL}/complete`,
        () => new Response(null, { status: 204 }),
      ),
    );
  }

  beforeEach(() => {
    createMediaRequests.length = 0;
  });

  it("uploads a file larger than the part size in parts", async () => {
    // penelope.png is 258,431 bytes: three parts of 100,000.
    mockUploadPaths(100_000);

    await uploadMedia({ ...baseParams, files: [PNG], compress: false });

    expect(multipartParts).toEqual([1, 2, 3]);
    expect(singlePosts).toBe(0);
  });

  it("sends a file no larger than the part size in a single POST", async () => {
    mockUploadPaths(10_000_000);

    await uploadMedia({ ...baseParams, files: [PNG], compress: false });

    expect(singlePosts).toBe(1);
    expect(multipartParts).toEqual([]);
  });

  it("sends a single POST when the server offers no multipart target", async () => {
    mockUploadPaths(null);

    await uploadMedia({ ...baseParams, files: [PNG], compress: false });

    expect(singlePosts).toBe(1);
    expect(multipartParts).toEqual([]);
  });
});
