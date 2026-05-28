import { http, HttpResponse } from "msw";

type CreateBuildParams = never;
type CreateBuildRequestBody = {
  commit: string;
  screenshots: { key: string; contentType: string }[];
  pwTraceKeys?: string[];
  branch?: string | null;
  name?: string | null;
  parallel?: boolean | null;
  parallelNonce?: string | null;
  mergeQueue?: boolean | null;
  mergeQueuePrNumbers?: number[] | null;
};
type CreateBuildResponseBody = {
  build: {
    id: string;
    url: string;
  };
  screenshots: {
    key: string;
    postUrl: string;
    fields: Record<string, string>;
  }[];
  pwTraces: {
    key: string;
    postUrl: string;
    fields: Record<string, string>;
  }[];
};

export const createBuild = http.post<
  CreateBuildParams,
  CreateBuildRequestBody,
  CreateBuildResponseBody
>("https://api.argos-ci.dev/builds", async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json({
    build: {
      id: "123",
      url: "https://app.argos-ci.dev/builds/123",
    },
    screenshots: body.screenshots.map((screenshot) => ({
      key: screenshot.key,
      postUrl: `https://api.s3.dev/upload/${screenshot.key}`,
      fields: {
        key: screenshot.key,
        "Content-Type": screenshot.contentType,
      },
    })),
    pwTraces: (body.pwTraceKeys ?? []).map((key) => ({
      key,
      postUrl: `https://api.s3.dev/upload/${key}`,
      fields: {
        key,
        "Content-Type": "application/zip",
      },
    })),
  });
});
