import { describe, it, expect, vi } from "vitest";
import type { ArgosAPISchema } from "@argos-ci/api-client";
import {
  findReferenceCommit,
  getCumulativeBatchSizes,
  MAX_COMMITS,
  PARENT_COMMITS_LIMIT,
  resolveBaseline,
} from "./find-reference-commit";

type Build = ArgosAPISchema.components["schemas"]["Build"];

/**
 * Build a fake baseline build whose head points to the given commit.
 */
function createBaseline(sha: string): Build {
  return { head: { sha, branch: "main" } } as Build;
}

/**
 * Create a `listCommits` that returns the closest `limit` commits from a fixed
 * history, mimicking how Git deepens an ancestor list.
 */
function createListCommits(history: string[]) {
  return vi.fn(async (limit: number) => history.slice(0, limit));
}

describe("#getCumulativeBatchSizes", () => {
  it("starts with 100 then grows by 500 up to 5000", () => {
    expect(getCumulativeBatchSizes()).toEqual([
      100, 600, 1100, 1600, 2100, 2600, 3100, 3600, 4100, 4600, 5000,
    ]);
  });

  it("never exceeds the maximum", () => {
    const sizes = getCumulativeBatchSizes();
    expect(sizes.at(-1)).toBe(MAX_COMMITS);
    expect(Math.max(...sizes)).toBe(MAX_COMMITS);
  });
});

describe("#findReferenceCommit", () => {
  it("returns the baseline commit found in the first batch", async () => {
    const history = Array.from({ length: 200 }, (_, i) => `commit-${i}`);
    const listCommits = createListCommits(history);
    const findBaseline = vi.fn(async () => createBaseline("commit-42"));

    const result = await findReferenceCommit({ listCommits, findBaseline });

    expect(result).toBe("commit-42");
    // Resolved in the first batch, so a single request is enough.
    expect(findBaseline).toHaveBeenCalledTimes(1);
    expect(findBaseline).toHaveBeenCalledWith(history.slice(0, 100));
  });

  it("only sends the new commits in each subsequent batch", async () => {
    const history = Array.from({ length: 700 }, (_, i) => `commit-${i}`);
    const listCommits = createListCommits(history);
    // No baseline in the first batch, found in the second.
    const findBaseline = vi
      .fn<(commits: string[]) => Promise<Build | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createBaseline("commit-321"));

    const result = await findReferenceCommit({ listCommits, findBaseline });

    expect(result).toBe("commit-321");
    expect(findBaseline).toHaveBeenCalledTimes(2);
    // First batch: commits 0..99.
    expect(findBaseline).toHaveBeenNthCalledWith(1, history.slice(0, 100));
    // Second batch: only the new commits 100..599.
    expect(findBaseline).toHaveBeenNthCalledWith(2, history.slice(100, 600));
  });

  it("returns null when no baseline is found in the whole history", async () => {
    const history = Array.from({ length: 250 }, (_, i) => `commit-${i}`);
    const listCommits = createListCommits(history);
    const findBaseline = vi.fn(async () => null);

    const result = await findReferenceCommit({ listCommits, findBaseline });

    expect(result).toBeNull();
    // First batch (100) finds nothing, second batch sees the remaining 150 and
    // the history is then exhausted.
    expect(findBaseline).toHaveBeenCalledTimes(2);
    expect(findBaseline).toHaveBeenNthCalledWith(2, history.slice(100, 250));
  });

  it("stops once the history is exhausted", async () => {
    const history = Array.from({ length: 50 }, (_, i) => `commit-${i}`);
    const listCommits = createListCommits(history);
    const findBaseline = vi.fn(async () => null);

    const result = await findReferenceCommit({ listCommits, findBaseline });

    expect(result).toBeNull();
    expect(findBaseline).toHaveBeenCalledTimes(1);
    expect(findBaseline).toHaveBeenCalledWith(history);
  });

  it("returns null without calling the API when there are no commits", async () => {
    const listCommits = vi.fn(async () => []);
    const findBaseline = vi.fn(async () => null);

    const result = await findReferenceCommit({ listCommits, findBaseline });

    expect(result).toBeNull();
    expect(findBaseline).not.toHaveBeenCalled();
  });

  it("does not exceed the maximum number of commits", async () => {
    const history = Array.from(
      { length: MAX_COMMITS + 1000 },
      (_, i) => `commit-${i}`,
    );
    const listCommits = createListCommits(history);
    const findBaseline = vi.fn<(commits: string[]) => Promise<Build | null>>(
      async () => null,
    );

    const result = await findReferenceCommit({ listCommits, findBaseline });

    expect(result).toBeNull();
    expect(findBaseline).toHaveBeenCalledTimes(
      getCumulativeBatchSizes().length,
    );
    // The last commit ever inspected is at index MAX_COMMITS - 1.
    const allInspected = findBaseline.mock.calls.flatMap((call) => call[0]);
    expect(allInspected).toHaveLength(MAX_COMMITS);
    expect(allInspected.at(-1)).toBe(`commit-${MAX_COMMITS - 1}`);
  });
});

/**
 * Create a `listCommits(sha, limit)` returning `[sha, ...ancestors]` truncated
 * to `limit`, mimicking how Git lists a commit followed by its ancestors.
 */
function createMergeBaseListCommits(ancestors: string[]) {
  return vi.fn(async (sha: string, limit: number) =>
    [sha, ...ancestors].slice(0, limit),
  );
}

describe("#resolveBaseline", () => {
  it("returns nulls and does nothing else when there is no merge base", async () => {
    const getMergeBase = vi.fn(async () => null);
    const listCommits =
      vi.fn<(sha: string, limit: number) => Promise<string[]>>();
    const findBaseline = vi.fn<(commits: string[]) => Promise<Build | null>>();

    const result = await resolveBaseline({
      getMergeBase,
      listCommits,
      findBaseline,
    });

    expect(result).toEqual({ referenceCommit: null, parentCommits: null });
    expect(listCommits).not.toHaveBeenCalled();
    expect(findBaseline).not.toHaveBeenCalled();
  });

  it("hands the server the merge base and its ancestors when a baseline is reachable", async () => {
    const ancestors = Array.from({ length: 500 }, (_, i) => `anc-${i}`);
    const getMergeBase = vi.fn(async () => "merge-base");
    const listCommits = createMergeBaseListCommits(ancestors);
    // The closest commit that happens to have a completed build right now.
    const findBaseline = vi.fn(async () => createBaseline("anc-42"));

    const result = await resolveBaseline({
      getMergeBase,
      listCommits,
      findBaseline,
    });

    // The merge base, not "anc-42". Naming a commit here would freeze the
    // baseline to the builds complete at this instant, and the server stops at
    // the reference commit as soon as it has a bucket for it.
    expect(result.referenceCommit).toBe("merge-base");
    expect(result.parentCommits).toEqual(
      ["merge-base", ...ancestors].slice(0, PARENT_COMMITS_LIMIT),
    );
    // A single request: the window the server searches on its own.
    expect(findBaseline).toHaveBeenCalledTimes(1);
    expect(findBaseline).toHaveBeenCalledWith(result.parentCommits);
  });

  it("offers the merge base itself as the first baseline candidate", async () => {
    const ancestors = Array.from({ length: 50 }, (_, i) => `anc-${i}`);
    const getMergeBase = vi.fn(async () => "merge-base");
    const listCommits = createMergeBaseListCommits(ancestors);
    const findBaseline = vi.fn<(commits: string[]) => Promise<Build | null>>(
      async () => createBaseline("merge-base"),
    );

    const result = await resolveBaseline({
      getMergeBase,
      listCommits,
      findBaseline,
    });

    expect(result.referenceCommit).toBe("merge-base");
    expect(findBaseline.mock.calls[0]?.[0]?.[0]).toBe("merge-base");
  });

  it("names the commit itself when the baseline is out of the server's reach", async () => {
    const ancestors = Array.from({ length: 1000 }, (_, i) => `anc-${i}`);
    const getMergeBase = vi.fn(async () => "merge-base");
    const listCommits = createMergeBaseListCommits(ancestors);
    const findBaseline = vi
      .fn<(commits: string[]) => Promise<Build | null>>()
      // Nothing within the window the server searches...
      .mockResolvedValueOnce(null)
      // ... but there is one further back, which it cannot walk to.
      .mockResolvedValueOnce(createBaseline("anc-700"));

    const result = await resolveBaseline({
      getMergeBase,
      listCommits,
      findBaseline,
    });

    expect(result.referenceCommit).toBe("anc-700");
    expect(result.parentCommits).toEqual(
      ["anc-700", ...ancestors].slice(0, PARENT_COMMITS_LIMIT),
    );
  });

  it("keeps the merge base when no baseline exists anywhere", async () => {
    const ancestors = Array.from({ length: 500 }, (_, i) => `anc-${i}`);
    const getMergeBase = vi.fn(async () => "merge-base");
    const listCommits = createMergeBaseListCommits(ancestors);
    const findBaseline = vi.fn(async () => null);

    const result = await resolveBaseline({
      getMergeBase,
      listCommits,
      findBaseline,
    });

    expect(result.referenceCommit).toBe("merge-base");
    expect(result.parentCommits).toEqual(
      ["merge-base", ...ancestors].slice(0, PARENT_COMMITS_LIMIT),
    );
    expect(result.parentCommits).toHaveLength(PARENT_COMMITS_LIMIT);
  });

  it("never lists a shallower history than it has already fetched", async () => {
    const ancestors = Array.from({ length: 1000 }, (_, i) => `anc-${i}`);
    const getMergeBase = vi.fn(async () => "merge-base");
    const listCommits = createMergeBaseListCommits(ancestors);
    const findBaseline = vi.fn(async () => null);

    await resolveBaseline({ getMergeBase, listCommits, findBaseline });

    const limits = listCommits.mock.calls.map(([, limit]) => limit);
    // Each listing deepens the shallow clone with a fetch, so a smaller limit
    // afterwards would shorten the history back and hide commits we have.
    expect(limits[0]).toBe(PARENT_COMMITS_LIMIT);
    expect(limits).toEqual([...limits].sort((a, b) => a - b));
  });
});
