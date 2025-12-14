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
  skipped: {
    env: "ARGOS_SKIPPED",
    format: Boolean,
    default: false,
  },
  mergeQueue: {
    format: Boolean,
    default: false,
  },
};

export interface Config {
  /**
   * Base URL of the Argos API.
   * Use this to target a self-hosted installation.
   * @default "https://api.argos-ci.com/v2/"
   */
  apiBaseUrl: string;

  /**
   * Git commit SHA.
   */
  commit: string;

  /**
   * Git branch name of the build.
   * @example "main", "develop", "release/1.0"
   */
  branch: string;

  /**
   * Argos repository access token.
   */
  token: string | null;

  /**
   * Custom build name.
   * Useful for multi-build setups on the same commit.
   */
  buildName: string | null;

  /**
   * Whether this build is split across multiple parallel jobs.
   * @default false
   */
  parallel: boolean;

  /**
   * Unique identifier shared by all parallel jobs.
   */
  parallelNonce: string | null;

  /**
   * Index of the current parallel job.
   * Must be between 1 and `parallelTotal`, or null if not set.
   */
  parallelIndex: number | null;

  /**
   * Total number of parallel jobs.
   * Use -1 if unknown, or null if not set.
   */
  parallelTotal: number | null;

  /**
   * Git branch used as the baseline for screenshot comparison.
   */
  referenceBranch: string | null;

  /**
   * Git commit SHA used as the baseline for screenshot comparison.
   */
  referenceCommit: string | null;

  /**
   * Repository slug of the source repository.
   * Example: "my-org/my-repo" or "my-user/my-repo".
   * If from a fork, this refers to the fork repository.
   */
  repository: string | null;

  /**
   * Repository slug of the original (base) repository.
   * Example: "my-org/my-repo" or "my-user/my-repo".
   * If from a fork, this refers to the base repository.
   */
  originalRepository: string | null;

  /**
   * CI job identifier (if provided by the CI environment).
   */
  jobId: string | null;

  /**
   * CI run identifier (if provided by the CI environment).
   */
  runId: string | null;

  /**
   * CI run attempt number (if provided by the CI environment).
   */
  runAttempt: number | null;

  /**
   * Pull request number associated with the build.
   */
  prNumber: number | null;

  /**
   * Pull request head commit SHA (if available).
   */
  prHeadCommit: string | null;

  /**
   * Pull request base branch (if available).
   */
  prBaseBranch: string | null;

  /**
   * Build mode to use.
   * - "ci": Review visual changes introduced by a feature branch and prevent regressions.
   * - "monitoring": Track visual changes outside the standard CI flow, either on a schedule or before a release.
   * @see https://argos-ci.com/docs/build-modes
   */
  mode: "ci" | "monitoring" | null;

  /**
   * Name of the detected CI provider (if available).
   * @example "github-actions", "gitlab-ci", "circleci"
   */
  ciProvider: string | null;

  /**
   * Diff sensitivity threshold between 0 and 1.
   * Higher values make Argos less sensitive to differences.
   */
  threshold: number | null;

  /**
   * Base URL to use for preview links.
   * @example "https://my-preview.example.com"
   */
  previewBaseUrl: string | null;

  /**
   * Skip this build.
   * No screenshots are uploaded, and the commit status is marked as success.
   */
  skipped?: boolean;

  /**
   * Whether the environment is a merge queue.
   */
  mergeQueue?: boolean;
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
    skipped: options.skipped ?? defaultConfig.skipped ?? false,
    mergeQueue: ciEnv?.mergeQueue ?? false,
  });

  if (!config.get("branch") || !config.get("commit")) {
    throw new Error(
      "Argos requires a branch and a commit to be set. If you are running in a non-git environment consider setting ARGOS_BRANCH and ARGOS_COMMIT environment variables.",
    );
  }

  config.validate();

  return config.get();
}

export async function getConfigFromOptions({
  parallel,
  ...options
}: Omit<Partial<Config>, "parallel"> & {
  parallel?:
    | {
        /** Unique build ID for this parallel build */
        nonce: string;
        /** The number of parallel nodes being ran */
        total: number;
        /** The index of the parallel node */
        index?: number;
      }
    | false
    | undefined;
}) {
  return readConfig({
    ...options,
    parallel: parallel !== undefined ? Boolean(parallel) : undefined,
    parallelNonce: parallel ? parallel.nonce : undefined,
    parallelTotal: parallel ? parallel.total : undefined,
    parallelIndex: parallel ? parallel.index : undefined,
  });
}
