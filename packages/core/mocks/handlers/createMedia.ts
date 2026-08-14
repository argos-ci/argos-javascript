import { http, HttpResponse } from "msw";

type CreateMediaRequestBody = {
  name: string;
  contentType: string;
  size: number;
  hash: string;
  state?: "before" | "after" | null;
  description?: string | null;
  visibility?: "team" | "public" | null;
  project?: string | null;
  prNumber?: number | null;
  branch?: string | null;
};

function buildMedia(body: CreateMediaRequestBody, status: string) {
  const shareUrl = "https://app.argos-ci.dev/m/share-token";
  const isVideo = body.contentType.startsWith("video/");
  return {
    id: "42",
    name: body.name,
    state: body.state ?? null,
    description: body.description ?? null,
    stage: body.prNumber ? "published" : "staged",
    branch: body.branch ?? null,
    prNumber: body.prNumber ?? null,
    url: shareUrl,
    markdown: isVideo
      ? `[▶ ${body.name}](${shareUrl})`
      : `![${body.name}](${shareUrl})`,
    version: 1,
    versionCount: 1,
    fileUrl: `${shareUrl}/file`,
    posterUrl: isVideo ? `${shareUrl}/ik-thumbnail.jpg?tr=so-1` : null,
    contentType: body.contentType,
    sizeBytes: body.size,
    width: null,
    height: null,
    // The real server infers this from the project when the caller sends
    // nothing; there is no project here, so the mock stands in with the private
    // answer. Tests that care about the choice assert on `createMediaRequests`.
    visibility: body.visibility ?? "team",
    status,
    expiresAt: null,
    createdAt: "2026-08-08T12:00:00.000Z",
  };
}

/** Records the bodies the SDK sent, so tests can assert on them. */
export const createMediaRequests: CreateMediaRequestBody[] = [];

export const createMedia = http.post<never, CreateMediaRequestBody>(
  "https://api.argos-ci.dev/media",
  async ({ request }) => {
    const body = await request.json();
    createMediaRequests.push(body);
    return HttpResponse.json(
      {
        media: buildMedia(body, "pending"),
        upload: {
          url: "https://api.s3.dev/upload/media",
          fields: { key: "media/1/hash.webp" },
        },
      },
      { status: 201 },
    );
  },
);

export const finalizeMedia = http.post(
  "https://api.argos-ci.dev/media/:mediaId/finalize",
  () => {
    const last = createMediaRequests.at(-1);
    return HttpResponse.json(
      buildMedia(
        last ?? {
          name: "unknown",
          contentType: "image/png",
          size: 0,
          hash: "",
        },
        "ready",
      ),
    );
  },
);
