import { http, HttpResponse } from "msw";

type CreateBuildParams = never;
type CreateBuildRequestBody = {
  commit: string;
  screenshotKeys: string[];
  branch?: string | null;
  name?: string | null;
  parallel?: boolean | null;
  parallelNonce?: string | null;
};
type CreateBuildResponseBody = {
  build: {
    id: string;
    url: string;
  };
  screenshots: {
    key: string;
    putUrl: string;
  }[];
};

export const createBuild = http.post<
  CreateBuildParams,
  CreateBuildRequestBody,
  CreateBuildResponseBody
>("https://api.argos-ci.dev/builds", async ({ request }) => {
  const { screenshotKeys } = await request.json();
  return HttpResponse.json({
    build: {
      id: "123",
      url: "https://app.argos-ci.dev/builds/123",
    },
    screenshots: screenshotKeys.map((key) => ({
      key,
      putUrl: `https://api.s3.dev/upload/${key}`,
    })),
  });
});
