/** Pages of builds looked through for a baseline before giving up. */
export const MAX_BASELINE_PAGES = 10;

/** Builds per page: the most the API serves. */
export const BASELINE_PAGE_SIZE = 100;

type BuildWithCommit = { head: { sha: string } };

/**
 * Find the most recent baseline among a branch's builds.
 *
 * Whether a build can be a baseline (complete, tests passed, not a subset,
 * approved and not rejected) is not part of the build the API returns, so this
 * leaves the decision to Argos: it walks the branch's builds newest first, a
 * page at a time, and asks `findBaseline` for the first of their commits that
 * has an eligible build. Gives up after `maxPages` pages.
 */
export async function findLatestBaseline<T extends BuildWithCommit>(
  api: {
    listBuilds: (
      page: number,
    ) => Promise<{ results: T[]; pageInfo: { total: number } }>;
    findBaseline: (commits: string[]) => Promise<T | null>;
  },
  { maxPages = MAX_BASELINE_PAGES }: { maxPages?: number } = {},
): Promise<T | null> {
  // A commit already sent covered every build on it, whichever page they
  // came from.
  const asked = new Set<string>();
  let listed = 0;
  for (let page = 1; page <= maxPages; page++) {
    const { results, pageInfo } = await api.listBuilds(page);
    listed += results.length;
    const commits = [...new Set(results.map((build) => build.head.sha))].filter(
      (sha) => !asked.has(sha),
    );
    if (commits.length > 0) {
      commits.forEach((sha) => asked.add(sha));
      const baseline = await api.findBaseline(commits);
      if (baseline) {
        return baseline;
      }
    }
    if (results.length === 0 || listed >= pageInfo.total) {
      break;
    }
  }
  return null;
}
