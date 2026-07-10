import type { ArgosAPISchema } from '@argos-ci/api-client';
import { createClient, throwAPIError } from '@argos-ci/api-client';
import { resolveArgosToken } from './auth';
import { readConfig } from './config';
import { skip } from './skip';

export type FinalizeParameters = {
    /**
     * Base URL of the Argos API.
     */
    apiBaseUrl?: string;

    /**
     * Argos token.
     */
    token?: string;

    parallel?: {
        nonce: string;
    };

    /**
     * Create a skipped build when no parallel build matches the nonce.
     * Useful when uploads are conditional (e.g. skipped by a CI cache such as
     * Turborepo or Nx) and Argos is a required status check: the skipped build
     * reports a success status even though nothing was uploaded.
     */
    skipIfEmpty?: boolean;

    /**
     * Name of the build, used by the skipped build created when `skipIfEmpty`
     * is enabled and no build matches the nonce.
     */
    buildName?: string;
};

type Build = ArgosAPISchema.components['schemas']['Build'];

export type FinalizeResult = {
    /**
     * Parallel builds finalized by this call.
     */
    builds: Build[];

    /**
     * Skipped build created when `skipIfEmpty` is enabled and no parallel
     * build matched the nonce, `null` otherwise.
     */
    skippedBuild: Build | null;
};

/**
 * Finalize pending builds.
 */
export async function finalize(params: FinalizeParameters): Promise<FinalizeResult> {
    const config = await readConfig({
        apiBaseUrl: params.apiBaseUrl,
        token: params.token,
        parallelNonce: params.parallel?.nonce,
    });
    const authToken = await resolveArgosToken(config);

    const apiClient = createClient({
        baseUrl: config.apiBaseUrl,
        authToken,
    });

    if (!config.parallelNonce) {
        throw new Error('parallel.nonce is required to finalize the build');
    }

    const finalizeBuildsResult = await apiClient.POST('/builds/finalize', {
        body: {
            parallelNonce: config.parallelNonce,
        },
    });

    if (finalizeBuildsResult.error) {
        throwAPIError(finalizeBuildsResult.error, finalizeBuildsResult.response);
    }

    const { builds } = finalizeBuildsResult.data;

    if (builds.length === 0 && params.skipIfEmpty) {
        const { build } = await skip({
            apiBaseUrl: params.apiBaseUrl,
            token: params.token,
            buildName: params.buildName,
        });
        return { builds, skippedBuild: build };
    }

    return { builds, skippedBuild: null };
}
