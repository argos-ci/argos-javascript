import { describe, expect, it, vi } from "vitest";
import { findLatestBaseline } from "./baseline";

type FakeBuild = { number: number; head: { sha: string } };

/**
 * A fake branch: `commits` lists each build's commit, newest first, served
 * `perPage` at a time. `eligible` are the commits that have a baseline build.
 */
function branch(
  commits: string[],
  {
    eligible = [],
    perPage = 2,
  }: { eligible?: string[]; perPage?: number } = {},
) {
  const builds = commits.map((sha, index) => ({
    number: commits.length - index,
    head: { sha },
  }));
  const listBuilds = vi.fn(async (page: number) => ({
    results: builds.slice((page - 1) * perPage, page * perPage),
    pageInfo: { total: builds.length },
  }));
  const findBaseline = vi.fn(async (shas: string[]) => {
    const sha = shas.find((sha) => eligible.includes(sha));
    return builds.find((build) => build.head.sha === sha) ?? null;
  });
  return { listBuilds, findBaseline };
}

describe("findLatestBaseline", () => {
  it("returns the newest eligible build of the first page", async () => {
    const api = branch(["c4", "c3", "c2", "c1"], { eligible: ["c3", "c1"] });
    const baseline = await findLatestBaseline<FakeBuild>(api);
    expect(baseline?.head.sha).toBe("c3");
    expect(api.listBuilds).toHaveBeenCalledTimes(1);
    expect(api.findBaseline).toHaveBeenCalledExactlyOnceWith(["c4", "c3"]);
  });

  it("moves on to older pages until a commit has a baseline", async () => {
    const api = branch(["c4", "c3", "c2", "c1"], { eligible: ["c1"] });
    const baseline = await findLatestBaseline<FakeBuild>(api);
    expect(baseline?.head.sha).toBe("c1");
    expect(api.findBaseline).toHaveBeenNthCalledWith(2, ["c2", "c1"]);
  });

  it("sends each commit once, however many builds it has", async () => {
    const api = branch(["c3", "c3", "c3", "c2"], { eligible: ["c2"] });
    await findLatestBaseline<FakeBuild>(api);
    expect(api.findBaseline).toHaveBeenNthCalledWith(1, ["c3"]);
    expect(api.findBaseline).toHaveBeenNthCalledWith(2, ["c2"]);
  });

  it("skips the lookup when a page brings no new commit", async () => {
    const api = branch(["c2", "c2", "c2", "c2", "c1"], { eligible: ["c1"] });
    await findLatestBaseline<FakeBuild>(api);
    expect(api.listBuilds).toHaveBeenCalledTimes(3);
    expect(api.findBaseline).toHaveBeenCalledTimes(2);
  });

  it("returns null once every build has been looked at", async () => {
    const api = branch(["c3", "c2", "c1"]);
    await expect(findLatestBaseline<FakeBuild>(api)).resolves.toBeNull();
    expect(api.listBuilds).toHaveBeenCalledTimes(2);
  });

  it("returns null for a branch without builds", async () => {
    const api = branch([]);
    await expect(findLatestBaseline<FakeBuild>(api)).resolves.toBeNull();
    expect(api.findBaseline).not.toHaveBeenCalled();
  });

  it("gives up after the page limit", async () => {
    const api = branch(["c6", "c5", "c4", "c3", "c2", "c1"], {
      eligible: ["c1"],
    });
    await expect(
      findLatestBaseline<FakeBuild>(api, { maxPages: 2 }),
    ).resolves.toBeNull();
    expect(api.listBuilds).toHaveBeenCalledTimes(2);
  });
});
