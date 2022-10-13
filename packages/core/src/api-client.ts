import axios from "axios";

export interface ApiClientOptions {
  baseUrl: string;
  bearerToken: string;
}

export interface CreateBuildInput {
  commit: string;
  screenshotKeys: string[];
  branch?: string | null;
  name?: string | null;
  parallel?: boolean | null;
  parallelNonce?: string | null;
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
}

export interface UpdateBuildInput {
  buildId: string;
  screenshots: { key: string; name: string }[];
  parallel?: boolean | null;
  parallelTotal?: number | null;
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

export const getBearerToken = ({
  token,
  ciService,
  owner,
  repository,
  jobId,
}: {
  token?: string | null;
  ciService?: string | null;
  owner?: string | null;
  repository?: string | null;
  jobId?: string | null;
}) => {
  if (token) return `Bearer ${token}`;

  switch (ciService) {
    case "GitHub Actions": {
      if (!owner || !repository || !jobId) {
        throw new Error(
          `Automatic ${ciService} variables detection failed. Please add the 'ARGOS_TOKEN'`
        );
      }

      return `Bearer tokenless-github-${base64Encode({
        owner,
        repository,
        jobId,
      })}`;
    }

    default:
      throw new Error("Missing Argos repository token 'ARGOS_TOKEN'");
  }
};

export const createArgosApiClient = (
  options: ApiClientOptions
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
    data: Record<string, any>
  ): Promise<TResult> => {
    try {
      const response = await axiosInstance.request({
        method,
        url: path,
        data,
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
      input: CreateBuildInput
    ): Promise<CreateBuildOutput> => {
      return call("POST", "/builds", input);
    },
    updateBuild: async (
      input: UpdateBuildInput
    ): Promise<UpdateBuildOutput> => {
      const { buildId, ...body } = input;
      return call("PUT", `/builds/${buildId}`, body);
    },
  };
};
