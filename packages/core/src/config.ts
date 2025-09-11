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

const minInteger = (min: number) => (value: number) => {
  if (!Number.isInteger(value)) {
    throw new Error("must be an integer");
  }
  if (value < min) {
    throw new Error(`must be at least ${min}`);
  }
};

const toInt = (value: string) => {
  if (value === "") {
    return null;
  }

  const num = Number(value);

  if (!Number.isInteger(num) || Number.isNaN(num)) {
    return num;
  }

  return num;
};

const toFloat = (value: string) => parseFloat(value);

convict.addFormat({
  name: "parallel-total",
  validate: minInteger(-1),
  coerce: toInt,
});

convict.addFormat({
  name: "parallel-index",
  validate: minInteger(1),
  coerce: toInt,
});

convict.addFormat({
  name: "float-percent",
  validate: (val) => {
    if (val !== 0 && (!val || val > 1 || val < 0)) {
      throw new Error("Must be a float between 0 and 1, inclusive.");
    }
  },
  coerce: toFloat,
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
    format: "parallel-index",
    default: null,
    nullable: true,
  },
  parallelTotal: {
    env: "ARGOS_PARALLEL_TOTAL",
    format: "parallel-total",
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

function createConfig() {
  return convict<Config>(schema, { args: [], env: {} });
}

function getDefaultConfig() {
  return Object.entries(schema).reduce<Record<string, any>>(
    (cfg, [key, entry]) => {
      cfg[key] =
        "env" in entry && entry.env && process.env[entry.env]
          ? process.env[entry.env]
          : entry.default;
      return cfg;
    },
    {} as Record<string, any>,
  ) as Config;
}

export async function readConfig(options: Partial<Config> = {}) {
  const config = createConfig();

  const ciEnv = await getCiEnvironment();
  const defaultConfig = getDefaultConfig();
  config.load({
    apiBaseUrl: options.apiBaseUrl || defaultConfig.apiBaseUrl,
    commit: options.commit || defaultConfig.commit || ciEnv?.commit || null,
    branch: options.branch || defaultConfig.branch || ciEnv?.branch || null,
    token: options.token || defaultConfig.token || null,
    buildName: options.buildName || defaultConfig.buildName || null,
    prNumber:
      options.prNumber || defaultConfig.prNumber || ciEnv?.prNumber || null,
    prHeadCommit: defaultConfig.prHeadCommit || ciEnv?.prHeadCommit || null,
    prBaseBranch: defaultConfig.prBaseBranch || ciEnv?.prBaseBranch || null,
    referenceBranch:
      options.referenceBranch || defaultConfig.referenceBranch || null,
    referenceCommit:
      options.referenceCommit || defaultConfig.referenceCommit || null,
    repository: ciEnv?.repository || null,
    jobId: ciEnv?.jobId || null,
    runId: ciEnv?.runId || null,
    runAttempt: ciEnv?.runAttempt || null,
    parallel: options.parallel ?? defaultConfig.parallel ?? false,
    parallelNonce:
      options.parallelNonce ||
      defaultConfig.parallelNonce ||
      ciEnv?.nonce ||
      null,
    parallelTotal: options.parallelTotal ?? defaultConfig.parallelTotal ?? null,
    parallelIndex: options.parallelIndex ?? defaultConfig.parallelIndex ?? null,
    mode: options.mode || defaultConfig.mode || null,
    ciProvider: ciEnv?.key || null,
    previewBaseUrl: defaultConfig.previewBaseUrl || null,
  });

  if (!config.get("branch") || !config.get("commit")) {
    throw new Error(
      "Argos requires a branch and a commit to be set. If you are running in a non-git environment consider setting ARGOS_BRANCH and ARGOS_COMMIT environment variables.",
    );
  }

  config.validate();

  return config.get();
}
