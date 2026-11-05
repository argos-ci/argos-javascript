import { http, HttpResponse } from "msw";
import { afterEach, describe, it, expect, vi } from "vitest";
import { server, setupMockServer } from "../mocks/server";
import { skip } from "./skip";

setupMockServer();

const params = {
  branch: "main",
  apiBaseUrl: "https://api.argos-ci.dev",
  commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
  token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
};

/** Collect the bodies `skip` sends to create the build. */
function captureCreateBuildBodies() {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.post("https://api.argos-ci.dev/builds", async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({
        build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
        screenshots: [],
      });
    }),
  );
  return bodies;
}

describe("#skip", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("marks the build as skipped", async () => {
    const result = await skip(params);

    expect(result).toEqual({
      build: { id: "123", url: "https://app.argos-ci.dev/builds/123" },
    });
  });

  it("names the project when it is set", async () => {
    const bodies = captureCreateBuildBodies();

    await skip({ ...params, project: "acme/web" });

    expect(bodies).toEqual([
      expect.objectContaining({ project: "acme/web", skipped: true }),
    ]);
  });

  it("sends no project when it is not set", async () => {
    vi.stubEnv("ARGOS_PROJECT", "");
    const bodies = captureCreateBuildBodies();

    await skip(params);

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toHaveProperty("project");
  });
});
