import { rest } from "msw";

interface CreateBuildBody {
  commit: string;
  screenshotKeys: string[];
  branch?: string | null;
  name?: string | null;
  parallel?: boolean | null;
  parallelNonce?: string | null;
}

interface UpdateBuildBody {
  screenshots: { key: string; name: string }[];
  parallel?: boolean | null;
  parallelTotal?: number | null;
}

export const handlers = [
  rest.post<CreateBuildBody>(
    "https://api.argos-ci.dev/builds",
    async (req, res, ctx) => {
      const { screenshotKeys } = await req.json<CreateBuildBody>();
      return res(
        ctx.json({
          build: {
            id: "123",
            url: "https://app.argos-ci.dev/builds/123",
          },
          screenshots: screenshotKeys.map((key) => ({
            key,
            putUrl: `https://api.s3.dev/upload/${key}`,
          })),
        })
      );
    }
  ),
  rest.put<UpdateBuildBody>(
    "https://api.argos-ci.dev/builds/:buildId",
    async (req, res, ctx) => {
      const { buildId } = req.params;
      return res(
        ctx.json({
          build: {
            id: buildId,
            url: `https://app.argos-ci.dev/builds/${buildId}`,
          },
        })
      );
    }
  ),
  rest.put("https://api.s3.dev/upload/*", async (_req, res, ctx) => {
    return res(ctx.status(201));
  }),
];
