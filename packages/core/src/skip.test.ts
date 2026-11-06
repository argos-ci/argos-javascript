import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createBuildRequests } from "../mocks/handlers/createBuild";
import { setupMockServer } from "../mocks/server";
import { skip } from "./skip";

setupMockServer();

const params = {
  branch: "main",
  apiBaseUrl: "https://api.argos-ci.dev",
  commit: "f16f980bd17cccfa93a1ae7766727e67950773d0",
  token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
};

describe("#skip", () => {
  beforeEach(() => {
    createBuildRequests.length = 0;
  });

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
    await skip({ ...params, project: "acme/web" });

    expect(createBuildRequests).toEqual([
      expect.objectContaining({ project: "acme/web", skipped: true }),
    ]);
  });

  it("sends no project when it is not set", async () => {
    vi.stubEnv("ARGOS_PROJECT", "");

    await skip(params);

    expect(createBuildRequests).toHaveLength(1);
    expect(createBuildRequests[0]).not.toHaveProperty("project");
  });
});
