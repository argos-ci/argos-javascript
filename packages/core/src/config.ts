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
  originalRepository: {
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
  /**
   * Argos API base URL (for self-hosted installations)
   */
  apiBaseUrl: string;
  /**
   * The commit SHA1 (40 characters)
   */
  commit: string;
  /**
   * The git branch name (e.g. "main", "master", "develop", "release/1.0" etc.)
   */
  branch: string;
  /**
   * The Argos repository token (40 characters)
   */
  token: string | null;
  /**
   * The name of the build (for multi-build setups)
   */
  buildName: string | null;
  /**
   * Whether the current run is parallelized (split in multiple jobs) or not
   */
  parallel: boolean;
  /**
   * The parallelization nonce (identifier shared by all parallel jobs)
   */
  parallelNonce: string | null;
  /**
   * The index of the current job (between 1 and parallelTotal inclusive, or null if not set)
   */
  parallelIndex: number | null;
  /**
   * The total number of parallel jobs (or -1 if unknown, or null if not set)
   */
  parallelTotal: number | null;
  /**
   * The reference git branch to compare against
   */
  referenceBranch: string | null;
  /**
   * The reference commit SHA1 to compare against
   */
  referenceCommit: string | null;
  /**
   * The git repository slug (e.g. "my-org/my-repo" or "my-user/my-repo")
   * If from a fork, this is the fork's repository.
   */
  repository: string | null;
  /**
   * The original git repository slug (e.g. "my-org/my-repo" or "my-user/my-repo")
   * If from a fork, this is the base repository.
   */
  originalRepository: string | null;
  /**
   * The CI job identifier (if available)
   */
  jobId: string | null;
  /**
   * The CI run identifier (if available)
   */
  runId: string | null;
  /**
   * The CI run attempt (if available)
   */
  runAttempt: number | null;
  /**
   * The pull request number (if available)
   */
  prNumber: number | null;
  /**
   * The pull request head commit SHA1 (if available)
   */
  prHeadCommit: string | null;
  /**
   * The pull request base branch (if available)
   */
  prBaseBranch: string | null;
  /**
   * The mode Argos is running in (ci or monitoring)
   */
  mode: "ci" | "monitoring" | null;
  /**
   * The CI provider name (if detected)
   */
  ciProvider: string | null;
  /**
   * The threshold to use for this run (if any, between 0 and 1 inclusive, e.g. 0.1 for 10% or 0.0 for 0%)
   */
  threshold: number | null;
  /**
   * The base URL to use for preview links (if any)
   */
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
    originalRepository: ciEnv?.originalRepository || null,
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
