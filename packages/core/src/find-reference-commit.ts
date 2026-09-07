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

  /**
   * Number of leading commits the caller has already inspected. Batches at or
   * below that size are skipped, so the search never asks for a shallower
   * history than the caller already fetched.
   */
  inspectedCount?: number;
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
  let inspectedCount = params.inspectedCount ?? 0;

  for (const limit of getCumulativeBatchSizes()) {
    // Already covered by the caller or by a previous batch. Asking anyway would
    // re-fetch the history at a shallower depth than it already has.
    if (limit <= inspectedCount) {
      continue;
    }

    const commits = await params.listCommits(limit);

    // Only send the commits not already inspected in previous batches. Earlier
    // commits are closer ancestors and have already been ruled out, so within
    // each batch the closest commit still wins overall.
    const batch = commits.slice(inspectedCount);

    // The listing stopped growing, so the history is exhausted. This is the only
    // reliable signal: a listing shorter than `limit` is normal on the shallow
    // clones CI uses, where git stops at the boundary of the fetched history and
    // a deeper fetch does bring more commits.
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
  }

  debug("No eligible baseline found among ancestor commits");
  return null;
}

/**
 * Number of commits (the reference commit plus its ancestors) sent as
 * `parentCommits`, which is the window the server searches on its own. The
 * server treats the first commit as the reference commit and searches the rest.
 */
export const PARENT_COMMITS_LIMIT = 300;

export interface ResolveBaselineParams {
  /**
   * Compute the commit of the base branch the build content is derived from —
   * the merge base of the build branch and its base branch, or a closer commit
   * when the CI service builds the branch merged into its base branch. Returns
   * `null` when no such commit can be found.
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
   * reference commit followed by its ancestors — or `null` when there is no
   * reference commit.
   */
  parentCommits: string[] | null;
}

/**
 * Resolve the baseline for a build that has no remote content access (no Git
 * provider connected).
 *
 * 1. Find the base commit the build content is derived from — usually the merge
 *    base, the closest common ancestor of the build branch and its base branch.
 *    This is always the starting point.
 * 2. Send it as the reference commit, followed by the ancestors the server
 *    searches on its own, and let the server pick the baseline when it
 *    processes the build.
 * 3. Only when no baseline is reachable from the merge base do we search deeper
 *    and name a commit ourselves, because past {@link PARENT_COMMITS_LIMIT} the
 *    server cannot walk back that far.
 *
 * Step 2 is deliberately not "resolve the baseline here and send that commit".
 * `findBaseline` only sees builds that are already complete, so on a busy base
 * branch the closest ones are routinely still running when this executes and
 * the search walks straight past them. A commit named here is also final: the
 * server stops at the reference commit as soon as it has a bucket, and for a
 * project without remote content access there is no ancestor list to fall back
 * on. Handing over the chain instead keeps the decision where the freshest
 * information is.
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

  const parentCommits = await params.listCommits(
    mergeBase,
    PARENT_COMMITS_LIMIT,
  );

  // Whether a baseline exists within the server's reach — not which one, that
  // is the server's call.
  const reachable = await params.findBaseline(parentCommits);
  if (reachable) {
    debug("Baseline reachable from the merge base", mergeBase);
    return { referenceCommit: mergeBase, parentCommits };
  }

  const referenceCommit = await findReferenceCommit({
    listCommits: (limit) => params.listCommits(mergeBase, limit),
    findBaseline: params.findBaseline,
    inspectedCount: parentCommits.length,
  });

  // Nothing anywhere in the history. Keep the merge base so the build is still
  // compared against whatever lands on it later.
  if (!referenceCommit) {
    debug("No baseline found, using merge base with parent commits", mergeBase);
    return { referenceCommit: mergeBase, parentCommits };
  }

  debug("Baseline out of the server's reach, using", referenceCommit);
  return {
    referenceCommit,
    parentCommits: await params.listCommits(
      referenceCommit,
      PARENT_COMMITS_LIMIT,
    ),
  };
}
