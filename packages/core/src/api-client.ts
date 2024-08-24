import axios from "axios";
import { debug } from "./debug";
import { ScreenshotMetadata } from "@argos-ci/util";

export interface ApiClientOptions {
  baseUrl: string;
  bearerToken: string;
}

export interface CreateBuildInput {
  commit: string;
  screenshotKeys: string[];
  pwTraceKeys: string[];
  branch?: string | null;
  name?: string | null;
  parallel?: boolean | null;
  parallelNonce?: string | null;
  prNumber?: number | null;
  prHeadCommit?: string | null;
  referenceBranch?: string | null;
  referenceCommit?: string | null;
  mode?: "ci" | "monitoring" | null;
  ciProvider?: string | null;
  argosSdk?: string | null;
  runId?: string | null;
  runAttempt?: number | null;
}

export interface CreateBuildOutput {
  build: {
    id: string;
    url: string;
  };
  screenshots: {
    key: string;
    putUrl: string;
  }[];
  pwTraces?: {
    key: string;
    putUrl: string;
  }[];
}

export interface UpdateBuildInput {
  buildId: string;
  screenshots: {
    key: string;
    name: string;
    metadata: ScreenshotMetadata | null;
    pwTraceKey: string | null;
    threshold: number | null;
  }[];
  parallel?: boolean | null;
  parallelTotal?: number | null;
  parallelIndex?: number | null;
}

export interface UpdateBuildOutput {
  build: {
    id: string;
    url: string;
  };
}

export interface ArgosApiClient {
  createBuild: (input: CreateBuildInput) => Promise<CreateBuildOutput>;
  updateBuild: (input: UpdateBuildInput) => Promise<UpdateBuildOutput>;
}

const base64Encode = (obj: any) =>
  Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

export function getAuthToken({
  token,
  ciProvider,
  owner,
  repository,
  jobId,
  runId,
  prNumber,
}: {
  token?: string | null;
  ciProvider?: string | null;
  owner?: string | null;
  repository?: string | null;
  jobId?: string | null;
  runId?: string | null;
  prNumber?: number | null;
}) {
  if (token) {
    return token;
  }

  switch (ciProvider) {
    case "github-actions": {
      if (!owner || !repository || !jobId || !runId) {
        throw new Error(
          `Automatic GitHub Actions variables detection failed. Please add the 'ARGOS_TOKEN'`,
        );
      }

      return `tokenless-github-${base64Encode({
        owner,
        repository,
        jobId,
        runId,
        prNumber,
      })}`;
    }

    default:
      throw new Error("Missing Argos repository token 'ARGOS_TOKEN'");
  }
}

export const createArgosLegacyAPIClient = (
  options: ApiClientOptions,
): ArgosApiClient => {
  const axiosInstance = axios.create({
    baseURL: options.baseUrl,
    headers: {
      Authorization: options.bearerToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const call = async <TResult extends Record<string, any>>(
    method: string,
    path: string,
    data: Record<string, any>,
  ): Promise<TResult> => {
    try {
      debug("Sending request", { method, path, data });
      const response = await axiosInstance.request({
        method,
        url: path,
        data,
      });
      debug("Getting response", {
        status: response.status,
        data: response.data,
      });
      return response.data;
    } catch (error: any) {
      if (error?.response?.data?.error?.message) {
        // @ts-ignore
        throw new Error(error.response.data.error.message, { cause: error });
      }
      throw error;
    }
  };

  return {
    createBuild: async (
      input: CreateBuildInput,
    ): Promise<CreateBuildOutput> => {
      return call("POST", "/builds", input);
    },
    updateBuild: async (
      input: UpdateBuildInput,
    ): Promise<UpdateBuildOutput> => {
      const { buildId, ...body } = input;
      return call("PUT", `/builds/${buildId}`, body);
    },
  };
};
