export interface Options {
  env?: Record<string, string | undefined>;
}

export interface Context {
  env: Record<string, string | undefined>;
}

export interface CiEnvironment {
  /**
   * Name of the CI service.
   */
  name: string | null;
  /**
   * Unique identifier of the CI service.
   */
  key: string | null;
  /**
   * Commit hash.
   */
  commit: string | null;
  /**
   * Branch name.
   */
  branch: string | null;
  /**
   * Owner of the repository.
   */
  owner: string | null;
  /**
   * Repository name.
   */
  repository: string | null;
  /**
   * The job_id of the current job. For example, greeting_job.
   * @see https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_id
   */
  jobId: string | null;
  /**
   * A unique number for each workflow run within a repository.
   * This number does not change if you re-run the workflow run. For example, 1658821493.
   */
  runId: string | null;
  /**
   * A unique number for each attempt of a particular workflow run in a repository.
   * This number begins at 1 for the workflow run's first attempt,
   * and increments with each re-run. For example, 3.
   */
  runAttempt: number | null;
  /**
   * Pull request number.
   */
  prNumber: number | null;
  /**
   * The commit hash of the head commit of the pull request.
   */
  prHeadCommit: string | null;
  /**
   * A unique string for each run of a particular workflow in a repository.
   */
  nonce: string | null;
}

type CIConfig = Omit<CiEnvironment, "name" | "key">;

export interface Service {
  name: string;
  key: string;
  detect(ctx: Context): boolean;
  config(ctx: Context): CIConfig | Promise<CIConfig>;
}
