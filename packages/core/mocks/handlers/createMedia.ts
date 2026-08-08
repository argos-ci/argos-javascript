import { http, HttpResponse } from "msw";

type CreateMediaRequestBody = {
  name: string;
  contentType: string;
  size: number;
  hash: string;
  slug?: string | null;
  visibility?: "team" | "public" | null;
  retentionDays?: number | null;
  accountSlug?: string | null;
  prNumber?: number | null;
  comment?: boolean | null;
};

function buildMedia(body: CreateMediaRequestBody, status: string) {
  const shareUrl = "https://app.argos-ci.dev/m/share-token";
  const isVideo = body.contentType.startsWith("video/");
  return {
    id: "42",
    name: body.name,
    slug: body.slug ?? null,
    url: shareUrl,
    markdown: isVideo
      ? `[▶ ${body.name}](${shareUrl})`
      : `![${body.name}](${shareUrl})`,
    posterUrl: isVideo ? `${shareUrl}/ik-thumbnail.jpg?tr=so-1` : null,
    contentType: body.contentType,
    sizeBytes: body.size,
    width: null,
    height: null,
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
          fields: { key: "media/1/hash.png" },
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
