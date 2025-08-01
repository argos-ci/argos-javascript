import convict from "convict";
import { getCiEnvironment } from "./ci-environment";

const mustBeApiBaseUrl = (value: any) => {
  const URL_REGEX =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

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
    throw new Error("Invalid Argos repository token (must be 40 characters)");
  }
};

convict.addFormat({
  name: "float-percent",
  validate: function (val) {
    if (val !== 0 && (!val || val > 1 || val < 0)) {
      throw new Error("Must be a float between 0 and 1, inclusive.");
    }
  },
  coerce: function (val) {
    return parseFloat(val);
  },
});

const schema = {
  apiBaseUrl: {
    env: "ARGOS_API_BASE_URL",
    default: "https://api.argos-ci.com/v2/",
    format: mustBeApiBaseUrl,
  },
  commit: {
    env: "ARGOS_COMMIT",
    default: null,
    format: mustBeCommit,
  },
  branch: {
    env: "ARGOS_BRANCH",
    default: null,
    format: String,
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
  mode: {
    env: "ARGOS_MODE",
    format: ["ci", "monitoring"],
    default: null,
    nullable: true,
  },
  prNumber: {
    env: "ARGOS_PR_NUMBER",
    format: Number,
    default: null,
    nullable: true,
  },
  prHeadCommit: {
    env: "ARGOS_PR_HEAD_COMMIT",
    format: String,
    default: null,
    nullable: true,
  },
  prBaseBranch: {
    env: "ARGOS_PR_BASE_BRANCH",
    format: String,
    default: null,
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
  parallelIndex: {
    env: "ARGOS_PARALLEL_INDEX",
    format: "nat",
    default: null,
    nullable: true,
  },
  parallelTotal: {
    env: "ARGOS_PARALLEL_TOTAL",
    format: "int",
    default: null,
    nullable: true,
  },
  referenceBranch: {
    env: "ARGOS_REFERENCE_BRANCH",
    format: String,
    default: null,
    nullable: true,
  },
  referenceCommit: {
    env: "ARGOS_REFERENCE_COMMIT",
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
  runAttempt: {
    format: "nat",
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
  ciProvider: {
    format: String,
    default: null,
    nullable: true,
  },
  threshold: {
    env: "ARGOS_THRESHOLD",
    format: "float-percent",
    default: null,
    nullable: true,
  },
  previewBaseUrl: {
    env: "ARGOS_PREVIEW_BASE_URL",
    format: String,
    default: null,
    nullable: true,
  },
};

export interface Config {
  apiBaseUrl: string;
  commit: string;
  branch: string;
  token: string | null;
  buildName: string | null;
  parallel: boolean;
  parallelNonce: string | null;
  parallelIndex: number | null;
  parallelTotal: number | null;
  referenceBranch: string | null;
  referenceCommit: string | null;
  repository: string | null;
  jobId: string | null;
  runId: string | null;
  runAttempt: number | null;
  prNumber: number | null;
  prHeadCommit: string | null;
  prBaseBranch: string | null;
  mode: "ci" | "monitoring" | null;
  ciProvider: string | null;
  threshold: number | null;
  previewBaseUrl: string | null;
}

const createConfig = () => {
  return convict<Config>(schema, {
    args: [],
  });
};

export async function readConfig(options: Partial<Config> = {}) {
  const config = createConfig();

  const ciEnv = await getCiEnvironment();

  config.load({
    apiBaseUrl: options.apiBaseUrl || config.get("apiBaseUrl"),
    commit: options.commit || config.get("commit") || ciEnv?.commit || null,
    branch: options.branch || config.get("branch") || ciEnv?.branch || null,
    token: options.token || config.get("token") || null,
    buildName: options.buildName || config.get("buildName") || null,
    prNumber:
      options.prNumber || config.get("prNumber") || ciEnv?.prNumber || null,
    prHeadCommit: config.get("prHeadCommit") || ciEnv?.prHeadCommit || null,
    prBaseBranch: config.get("prBaseBranch") || ciEnv?.prBaseBranch || null,
    referenceBranch:
      options.referenceBranch || config.get("referenceBranch") || null,
    referenceCommit:
      options.referenceCommit || config.get("referenceCommit") || null,
    repository: ciEnv?.repository || null,
    jobId: ciEnv?.jobId || null,
    runId: ciEnv?.runId || null,
    runAttempt: ciEnv?.runAttempt || null,
    parallel: options.parallel ?? config.get("parallel") ?? false,
    parallelNonce:
      options.parallelNonce ||
      config.get("parallelNonce") ||
      ciEnv?.nonce ||
      null,
    parallelTotal: options.parallelTotal ?? config.get("parallelTotal") ?? null,
    parallelIndex: options.parallelIndex ?? config.get("parallelIndex") ?? null,
    mode: options.mode || config.get("mode") || null,
    ciProvider: ciEnv?.key || null,
    previewBaseUrl: config.get("previewBaseUrl") || null,
  });

  config.validate();

  return config.get();
}
