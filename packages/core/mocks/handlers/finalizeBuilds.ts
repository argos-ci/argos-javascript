import { http, HttpResponse } from "msw";

type FinalizeBuildsParams = never;
type FinalizeBuildsRequestBody = {
  parallelNonce: string;
  project?: string | null;
};
type FinalizeBuildsResponseBody = {
  builds: {
    id: string;
    url: string;
  }[];
};

/** Every body sent to `POST /builds/finalize`, for tests to assert on. */
export const finalizeBuildsRequests: FinalizeBuildsRequestBody[] = [];

export const finalizeBuilds = http.post<
  FinalizeBuildsParams,
  FinalizeBuildsRequestBody,
  FinalizeBuildsResponseBody
>("https://api.argos-ci.dev/builds/finalize", async ({ request }) => {
  const body = await request.json();
  finalizeBuildsRequests.push(body);
  // The "empty" nonce simulates a run where no parallel build was uploaded.
  if (body.parallelNonce === "empty") {
    return HttpResponse.json({ builds: [] });
  }
  return HttpResponse.json({
    builds: [
      {
        id: "456",
        url: "https://app.argos-ci.dev/builds/456",
      },
    ],
  });
});
