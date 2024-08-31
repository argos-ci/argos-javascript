import { createClient } from "@argos-ci/api-client";
import { getAuthToken } from "./auth";
import { readConfig } from "./config";

export type FinalizeParameters = {
  parallel?: {
    nonce: string;
  };
};

/**
 * Finalize pending builds.
 */
export async function finalize(params: FinalizeParameters) {
  const config = await readConfig({
    parallelNonce: params.parallel?.nonce ?? null,
  });
  const authToken = getAuthToken(config);

  const apiClient = createClient({
    baseUrl: config.apiBaseUrl,
    authToken,
  });

  if (!config.parallelNonce) {
    throw new Error("parallel.nonce is required to finalize the build");
  }

  const finalizeBuildsResult = await apiClient.POST("/builds/finalize", {
    body: {
      parallelNonce: config.parallelNonce,
    },
  });

  if (finalizeBuildsResult.error) {
    throw new Error(finalizeBuildsResult.error.error);
  }

  return finalizeBuildsResult.data;
}
