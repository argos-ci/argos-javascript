import { http, HttpResponse } from "msw";

type UpdateBuildParams = { buildId: string };
type UpdateBuildRequestBody = {
  screenshots: { key: string; name: string }[];
  parallel?: boolean | null;
  parallelTotal?: number | null;
};
type UpdateBuildResponseBody = {
  build: {
    id: string;
    url: string;
  };
};
export const updateBuild = http.put<
  UpdateBuildParams,
  UpdateBuildRequestBody,
  UpdateBuildResponseBody
>("https://api.argos-ci.dev/builds/:buildId", async ({ params }) => {
  const { buildId } = params;
  return HttpResponse.json({
    build: {
      id: buildId,
      url: `https://app.argos-ci.dev/builds/${buildId}`,
    },
  });
});
