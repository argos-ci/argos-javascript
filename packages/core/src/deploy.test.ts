import { join } from "node:path";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deploy } from "./deploy";
import { server, setupMockServer } from "../mocks/server";

setupMockServer();

const apiBaseUrl = "https://api.argos-ci.dev";
const commit = "f16f980bd17cccfa93a1ae7766727e67950773d0";
const prHeadCommit = "0f9b1d6ec5e7a1b2c3d4e5f60718293a4b5c6d7e";

/**
 * Answers the deployment requests and collects the bodies `deploy` sends to
 * create one.
 */
function captureDeploymentBodies() {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${apiBaseUrl}/deployments`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(
        { deploymentId: "42", uploadFiles: [] },
        { status: 201 },
      );
    }),
    http.post(`${apiBaseUrl}/deployments/42/finalize`, () =>
      HttpResponse.json({ id: "42", status: "ready" }),
    ),
  );
  return bodies;
}

function deployFixture() {
  return deploy({
    root: join(__dirname, "../../../__fixtures__/deploy"),
    apiBaseUrl,
    commit,
    branch: "feature",
    token: "92d832e0d22ab113c8979d73a87a11130eaa24a9",
  });
}

describe("#deploy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends the head commit of the pull request", async () => {
    vi.stubEnv("ARGOS_PR_NUMBER", "12");
    vi.stubEnv("ARGOS_PR_HEAD_COMMIT", prHeadCommit);
    const bodies = captureDeploymentBodies();

    await deployFixture();

    expect(bodies).toEqual([
      expect.objectContaining({ commit, prNumber: 12, prHeadCommit }),
    ]);
  });

  it("leaves the head commit out in a merge queue", async () => {
    vi.stubEnv("ARGOS_PR_NUMBER", "12");
    vi.stubEnv("ARGOS_PR_HEAD_COMMIT", prHeadCommit);
    vi.stubEnv("ARGOS_MERGE_QUEUE_PRS", "12");
    const bodies = captureDeploymentBodies();

    await deployFixture();

    expect(bodies).toEqual([
      expect.objectContaining({ commit, prHeadCommit: null }),
    ]);
  });
});
