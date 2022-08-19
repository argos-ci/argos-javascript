import axios from "axios";

export interface ApiClientOptions {
  baseUrl: string;
  token: string;
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

export const createArgosApiClient = (
  options: ApiClientOptions
): ArgosApiClient => {
  const axiosInstance = axios.create({
    baseURL: options.baseUrl,
    headers: {
      Authorization: `Bearer ${options.token}`,
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
    } catch (error) {
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
