import type { ArgosAPISchema } from "@argos-ci/api-client";
import { debug } from "./debug";

type Build = ArgosAPISchema.components["schemas"]["Build"];

/**
 * Number of commits inspected in the first batch. Kept small so the common case
 * — the baseline is among the most recent ancestors — resolves with a single
 * lightweight request.
 */
export const FIRST_BATCH_SIZE = 100;

/**
 * Number of commits inspected in each subsequent batch. Larger than the first
 * batch to widen the search quickly when the baseline is further back.
 */
export const NEXT_BATCH_SIZE = 500;

/**
 * Maximum number of commits inspected before giving up.
 */
export const MAX_COMMITS = 5000;

/**
 * Cumulative number of commits to inspect after each batch: 100, 600, 1100, …,
 * up to {@link MAX_COMMITS}.
 */
export function getCumulativeBatchSizes(): number[] {
  const sizes: number[] = [];
  let total = Math.min(FIRST_BATCH_SIZE, MAX_COMMITS);
  sizes.push(total);
  while (total < MAX_COMMITS) {
    total = Math.min(total + NEXT_BATCH_SIZE, MAX_COMMITS);
    sizes.push(total);
  }
  return sizes;
}

export interface FindReferenceCommitParams {
  /**
   * List the ancestor commits of the build, ordered from the closest to the
   * furthest ancestor, up to `limit` commits. Returns fewer commits when the
   * history is shorter.
   */
  listCommits: (limit: number) => Promise<string[]>;

  /**
   * Find an eligible baseline build among the given commits, ordered from the
   * closest to the furthest ancestor. Returns the baseline build, or `null`
   * when none is found.
   */
  findBaseline: (commits: string[]) => Promise<Build | null>;
}

/**
 * Find the reference commit by asking the API to pick the closest commit that
 * has an eligible baseline build, among a list of candidate commits ordered from
 * the closest to the furthest ancestor. That build's commit becomes the
 * reference commit.
 *
 * Commits are inspected in growing batches ({@link FIRST_BATCH_SIZE}, then
 * {@link NEXT_BATCH_SIZE} per request, up to {@link MAX_COMMITS}) so the common
 * case resolves quickly without fetching and sending the whole history.
 */
export async function findReferenceCommit(
  params: FindReferenceCommitParams,
): Promise<string | null> {
  let inspectedCount = 0;

  for (const limit of getCumulativeBatchSizes()) {
    const commits = await params.listCommits(limit);

    // Only send the commits not already inspected in previous batches. Earlier
    // commits are closer ancestors and have already been ruled out, so within
    // each batch the closest commit still wins overall.
    const batch = commits.slice(inspectedCount);

    // No new commits became available: the history is exhausted.
    if (batch.length === 0) {
      break;
    }

    debug(`Looking for a baseline among ${batch.length} commit(s)`);
    const baseline = await params.findBaseline(batch);
    if (baseline) {
      debug("Found baseline build for reference commit", baseline.head.sha);
      return baseline.head.sha;
    }

    inspectedCount = commits.length;

    // Fewer commits than requested: the history is exhausted, so asking for more
    // would return the same list.
    if (commits.length < limit) {
      break;
    }
  }

  debug("No eligible baseline found among ancestor commits");
  return null;
}

/**
 * Number of commits (the merge base plus its ancestors) sent as `parentCommits`
 * when no baseline build is found yet. The baseline build may still be
 * processing on the server; sending these lets the server resolve the baseline
 * once it completes, when it processes this build. The server treats the first
 * commit as the reference commit and searches the rest.
 */
export const PARENT_COMMITS_LIMIT = 300;

export interface ResolveBaselineParams {
  /**
   * Compute the merge base commit between the build branch and its base branch,
   * or `null` when none can be found.
   */
  getMergeBase: () => Promise<string | null>;

  /**
   * List a commit followed by its ancestors, ordered from the commit itself to
   * the furthest ancestor, up to `limit` commits.
   */
  listCommits: (sha: string, limit: number) => Promise<string[]>;

  /**
   * Find an eligible baseline build among the given commits, ordered from the
   * closest to the furthest ancestor. Returns the baseline build, or `null`
   * when none is found.
   */
  findBaseline: (commits: string[]) => Promise<Build | null>;
}

export interface BaselineResolution {
  /** Commit to use as the baseline reference, or `null` when none. */
  referenceCommit: string | null;
  /**
   * Commits sent to the server so it can resolve the baseline itself — the
   * reference commit followed by its ancestors — or `null` when not needed.
   */
  parentCommits: string[] | null;
}

/**
 * Resolve the baseline for a build that has no remote content access (no Git
 * provider connected).
 *
 * 1. Find the merge base — the closest common ancestor of the build branch and
 *    its base branch. This is always the starting point.
 * 2. From the merge base, ask the API to pick the closest commit (the merge base
 *    itself or one of its ancestors) that has an eligible baseline build, and use
 *    it as the reference commit.
 * 3. If none is found, the baseline build may still be processing on the server.
 *    Fall back to the merge base as the reference commit and send its parent
 *    commits so the server can resolve the baseline once that build completes.
 */
export async function resolveBaseline(
  params: ResolveBaselineParams,
): Promise<BaselineResolution> {
  const mergeBase = await params.getMergeBase();
  if (!mergeBase) {
    debug("No merge base found");
    return { referenceCommit: null, parentCommits: null };
  }
  debug("Found merge base", mergeBase);

  const referenceCommit = await findReferenceCommit({
    listCommits: (limit) => params.listCommits(mergeBase, limit),
    findBaseline: params.findBaseline,
  });

  if (referenceCommit) {
    debug("Found reference commit from baseline", referenceCommit);
    return { referenceCommit, parentCommits: null };
  }

  // No eligible baseline build yet — it may still be processing. Fall back to
  // the merge base and let the server resolve the baseline from the parent
  // commits once that build completes.
  const parentCommits = await params.listCommits(
    mergeBase,
    PARENT_COMMITS_LIMIT,
  );
  debug("No baseline found, using merge base with parent commits", mergeBase);
  return { referenceCommit: mergeBase, parentCommits };
}
