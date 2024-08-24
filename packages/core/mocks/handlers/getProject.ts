import { http, HttpResponse } from "msw";

type GetProjectResponseBody = {
  id: string;
  defaultBaseBranch: string;
  hasRemoteContentAccess: boolean;
};

export const getProject = http.get<never, never, GetProjectResponseBody>(
  "https://api.argos-ci.dev/project",
  async () => {
    return HttpResponse.json({
      id: "123",
      defaultBaseBranch: "main",
      hasRemoteContentAccess: true,
    });
  },
);
