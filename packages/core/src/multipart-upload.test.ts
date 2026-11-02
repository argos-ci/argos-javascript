import { randomBytes } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { server, setupMockServer } from "../mocks/server";
import { uploadFileInParts } from "./multipart-upload";

setupMockServer();

const MULTIPART_URL = "https://api.argos-ci.dev/uploads/multipart";
const PART_SIZE = 1024;
const SESSION = "signed-session-token";

type Recorded = {
  start: unknown[];
  /** Every part request, retries included, in the order they arrived. */
  parts: { partNumber: number; session: string | null; body: Buffer }[];
  complete: unknown[];
  abort: unknown[];
};

let recorded: Recorded;

/**
 * Stand in for the server's multipart relay. `failPart` decides, per attempt,
 * which status a part answers with instead of storing it.
 */
function mockMultipartServer(
  options: {
    failPart?: (partNumber: number, attempt: number) => number | null;
  } = {},
) {
  const attempts = new Map<number, number>();
  server.use(
    http.post(MULTIPART_URL, async ({ request }) => {
      const body = (await request.json()) as { size: number };
      recorded.start.push(body);
      return HttpResponse.json(
        {
          session: SESSION,
          partSize: PART_SIZE,
          partCount: Math.ceil(body.size / PART_SIZE),
          expiresAt: "2026-10-29T12:00:00.000Z",
        },
        { status: 201 },
      );
    }),
    http.put(
      `${MULTIPART_URL}/parts/:partNumber`,
      async ({ request, params }) => {
        const partNumber = Number(params["partNumber"]);
        const attempt = (attempts.get(partNumber) ?? 0) + 1;
        attempts.set(partNumber, attempt);
        recorded.parts.push({
          partNumber,
          session: request.headers.get("x-upload-session"),
          body: Buffer.from(await request.arrayBuffer()),
        });
        const failure = options.failPart?.(partNumber, attempt);
        if (failure) {
          return new Response("<Error><Code>Nope</Code></Error>", {
            status: failure,
          });
        }
        return HttpResponse.json({
          partNumber,
          etag: `"etag-${partNumber}"`,
          checksumCRC32: `crc-${partNumber}`,
        });
      },
    ),
    http.post(`${MULTIPART_URL}/complete`, async ({ request }) => {
      recorded.complete.push(await request.json());
      return new Response(null, { status: 204 });
    }),
    http.post(`${MULTIPART_URL}/abort`, async ({ request }) => {
      recorded.abort.push(await request.json());
      return new Response(null, { status: 204 });
    }),
  );
}

/** A file of `size` random bytes. */
async function createFile(
  size: number,
): Promise<{ path: string; bytes: Buffer }> {
  const dir = await mkdtemp(join(tmpdir(), "snapvisor-multipart-"));
  const path = join(dir, "video.mp4");
  const bytes = randomBytes(size);
  await writeFile(path, bytes);
  return { path, bytes };
}

function upload(file: { path: string; bytes: Buffer }) {
  return uploadFileInParts({
    target: { url: MULTIPART_URL, partSize: PART_SIZE },
    fields: { "Content-Type": "video/mp4", policy: "signed-policy" },
    path: file.path,
    size: file.bytes.length,
    contentType: "video/mp4",
    retryMinTimeout: 0,
  });
}

describe("#uploadFileInParts", () => {
  beforeEach(() => {
    recorded = { start: [], parts: [], complete: [], abort: [] };
  });

  it("sends the file in parts of the server's size and completes the upload", async () => {
    mockMultipartServer();
    const file = await createFile(PART_SIZE * 2 + 512);

    await upload(file);

    expect(recorded.start).toEqual([
      { "Content-Type": "video/mp4", policy: "signed-policy", size: 2560 },
    ]);
    expect(
      recorded.parts.map(({ partNumber, body }) => [partNumber, body.length]),
    ).toEqual([
      [1, 1024],
      [2, 1024],
      [3, 512],
    ]);
    expect(recorded.parts.every((part) => part.session === SESSION)).toBe(true);
    expect(
      Buffer.concat(recorded.parts.map((part) => part.body)).equals(file.bytes),
    ).toBe(true);
    expect(recorded.complete).toEqual([
      {
        session: SESSION,
        parts: [1, 2, 3].map((partNumber) => ({
          partNumber,
          etag: `"etag-${partNumber}"`,
          checksumCRC32: `crc-${partNumber}`,
        })),
      },
    ]);
    expect(recorded.abort).toEqual([]);
  });

  it("sends a single part when the file is exactly one part", async () => {
    mockMultipartServer();
    const file = await createFile(PART_SIZE);

    await upload(file);

    expect(recorded.parts.map((part) => part.partNumber)).toEqual([1]);
    expect(recorded.complete).toHaveLength(1);
  });

  it("retries a part that failed on a server error, then completes", async () => {
    mockMultipartServer({
      failPart: (partNumber, attempt) =>
        partNumber === 2 && attempt === 1 ? 503 : null,
    });
    const file = await createFile(PART_SIZE * 3);

    await upload(file);

    expect(recorded.parts.map((part) => part.partNumber)).toEqual([1, 2, 2, 3]);
    // The retry resends the very same bytes.
    expect(recorded.parts[1]!.body.equals(recorded.parts[2]!.body)).toBe(true);
    expect(recorded.complete).toHaveLength(1);
    expect(recorded.abort).toEqual([]);
  });

  it("aborts without retrying when a part is refused for good", async () => {
    mockMultipartServer({
      failPart: (partNumber) => (partNumber === 2 ? 400 : null),
    });
    const file = await createFile(PART_SIZE * 3);

    await expect(upload(file)).rejects.toThrow(
      `Failed to upload file to ${MULTIPART_URL}/parts/2: 400 — Nope`,
    );

    expect(recorded.parts.map((part) => part.partNumber)).toEqual([1, 2]);
    expect(recorded.complete).toEqual([]);
    expect(recorded.abort).toEqual([{ session: SESSION }]);
  });

  it("aborts once a part has used up its retries", async () => {
    mockMultipartServer({
      failPart: (partNumber) => (partNumber === 1 ? 500 : null),
    });
    const file = await createFile(PART_SIZE * 2);

    await expect(upload(file)).rejects.toThrow("500");

    // The first attempt and three retries.
    expect(recorded.parts.map((part) => part.partNumber)).toEqual([1, 1, 1, 1]);
    expect(recorded.complete).toEqual([]);
    expect(recorded.abort).toEqual([{ session: SESSION }]);
  });

  it("does not open parts when the server refuses to start the upload", async () => {
    mockMultipartServer();
    server.use(
      http.post(MULTIPART_URL, () =>
        HttpResponse.json({ error: "Policy expired" }, { status: 403 }),
      ),
    );
    const file = await createFile(PART_SIZE * 2);

    await expect(upload(file)).rejects.toThrow("403");

    expect(recorded.parts).toEqual([]);
    expect(recorded.abort).toEqual([]);
  });
});
