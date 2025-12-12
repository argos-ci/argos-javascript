import type { ArgosAPISchema } from "@argos-ci/api-client";
import { createClient, throwAPIError } from "@argos-ci/api-client";
import { getConfigFromOptions } from "./config";
import { getAuthToken } from "./auth";
import { getArgosCoreSDKIdentifier } from "./version";
import type { UploadParameters } from "./upload";

type SkipParameters = Pick<
  UploadParameters,
  | "apiBaseUrl"
  | "commit"
  | "branch"
  | "token"
  | "prNumber"
  | "buildName"
  | "metadata"
>;

/**
 * Mark a build as skipped.
 */
export async function skip(
  params: SkipParameters,
): Promise<{ build: ArgosAPISchema.components["schemas"]["Build"] }> {
  const [config, argosSdk] = await Promise.all([
    getConfigFromOptions(params),
    getArgosCoreSDKIdentifier(),
  ]);

  const authToken = getAuthToken(config);

  const apiClient = createClient({
    baseUrl: config.apiBaseUrl,
    authToken,
  });

  const createBuildResponse = await apiClient.POST("/builds", {
    body: {
      commit: config.commit,
      branch: config.branch,
      name: config.buildName,
      mode: config.mode,
      prNumber: config.prNumber,
      prHeadCommit: config.prHeadCommit,
      referenceBranch: config.referenceBranch,
      referenceCommit: config.referenceCommit,
      argosSdk,
      ciProvider: config.ciProvider,
      runId: config.runId,
      runAttempt: config.runAttempt,
      skipped: true,
      screenshotKeys: [],
      pwTraceKeys: [],
      parentCommits: [],
    },
  });

  if (createBuildResponse.error) {
    throwAPIError(createBuildResponse.error);
  }

  return { build: createBuildResponse.data.build };
}
