import convict from "convict";

const mustBeApiBaseUrl = (value: any) => {
  const URL_REGEX =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

  if (!URL_REGEX.test(value)) {
    throw new Error("Invalid Argos API base URL");
  }
};

const mustBeCommit = (value: any) => {
  const SHA1_REGEX = /^[0-9a-f]{40}$/;

  if (!SHA1_REGEX.test(value)) {
    const SHA1_SHORT_REGEX = /^[0-9a-f]{7}$/;
    if (SHA1_SHORT_REGEX.test(value)) {
      throw new Error("Short SHA1 is not allowed");
    }
    throw new Error("Invalid commit");
  }
};

const mustBeArgosToken = (value: any) => {
  if (value && value.length !== 40) {
    throw new Error("Must be a valid Argos repository token");
  }
};

const schema = {
  apiBaseUrl: {
    env: "ARGOS_API_BASE_URL",
    default: "https://api.argos-ci.com/v2/",
    format: mustBeApiBaseUrl,
  },
  commit: {
    env: "ARGOS_COMMIT",
    default: "",
    format: mustBeCommit,
  },
  branch: {
    env: "ARGOS_BRANCH",
    default: null,
    format: String,
    nullable: true,
  },
  token: {
    env: "ARGOS_TOKEN",
    default: null,
    format: mustBeArgosToken,
  },
  buildName: {
    env: "ARGOS_BUILD_NAME",
    default: null,
    format: String,
    nullable: true,
  },
  parallel: {
    env: "ARGOS_PARALLEL",
    default: false,
    format: Boolean,
  },
  parallelNonce: {
    env: "ARGOS_PARALLEL_NONCE",
    format: String,
    default: null,
    nullable: true,
  },
  parallelTotal: {
    env: "ARGOS_PARALLEL_TOTAL",
    format: "nat",
    default: null,
    nullable: true,
  },
  ciService: {
    format: String,
    default: null,
    nullable: true,
  },
  jobId: {
    format: String,
    default: null,
    nullable: true,
  },
  runId: {
    format: String,
    default: null,
    nullable: true,
  },
  prNumber: {
    format: Number,
    default: null,
    nullable: true,
  },
  owner: {
    format: String,
    default: null,
    nullable: true,
  },
  repository: {
    format: String,
    default: null,
    nullable: true,
  },
};

export interface Config {
  apiBaseUrl: string;
  commit: string;
  branch: string | null;
  token: string | null;
  buildName: string | null;
  parallel: boolean;
  parallelNonce: string | null;
  parallelTotal: number | null;
  owner: string | null;
  repository: string | null;
  jobId: string | null;
  runId: string | null;
  prNumber: number | null;
}

export const createConfig = () => {
  return convict<Config>(schema, {
    args: [],
  });
};
