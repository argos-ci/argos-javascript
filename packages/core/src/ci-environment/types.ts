export interface Context {
  env: Record<string, string | undefined>;
}

export interface CiEnvironment {
  /**
   * Name of the CI service, e.g. "GitHub Actions".
   */
  name: string | null;

  /**
   * Key of the CI service, e.g. "github-actions".
   */
  key: string | null;

  /**
   * The commit SHA1 being built.
   */
  commit: string | null;

  /**
   * The git branch name (e.g. "main", "master", "develop", "release/1.0" etc.)
   */
  branch: string | null;

  /**
   * Repository slug, e.g. owner/name.
   * If from a fork, this is the fork's repository.
   */
  repository: string | null;

  /**
   * The original git repository slug (e.g. "my-org/my-repo" or "my-user/my-repo")
   * If from a fork, this is the base repository.
   */
  originalRepository: string | null;

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
   * The pull request number if the current job is building a PR.
   */
  prNumber: number | null;

  /**
   * The commit SHA1 of the head commit of the pull request if the current job is building a PR.
   */
  prHeadCommit: string | null;

  /**
   * The branch name of the base branch of the pull request if the current job is building a PR.
   */
  prBaseBranch: string | null;

  /**
   * A unique identifier for the current run, combining runId and runAttempt.
   */
  nonce: string | null;

  /**
   * Weither the CI environment is a merge queue.
   */
  mergeQueue: boolean;
}

type CIConfig = Omit<CiEnvironment, "name" | "key">;

export interface Service {
  name: string;
  key: string;
  detect(ctx: Context): boolean;
  config(ctx: Context): CIConfig | Promise<CIConfig>;
  getMergeBaseCommitSha(
    input: {
      base: string;
      head: string;
    },
    ctx: Context,
  ): string | null;
  listParentCommits(
    input: {
      sha: string;
    },
    ctx: Context,
  ): string[] | null;
}
