import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../types";
import service from "./github-actions";

describe("#getMergeBaseCommitSha", () => {
  let cwd: string;
  let root: string;
  let repoDir: string;
  let eventPath: string;
  /** Commit `feature` branched off from — the merge base of `feature` and `main`. */
  let forkSha: string;
  /** Tip of `main`, merged into the test-merge commit. */
  let mainSha: string;
  /** Tip of `feature`, the pull request head. */
  let featureSha: string;
  /** Test-merge commit: `feature` merged into the tip of `main`. */
  let mergeSha: string;

  function writeEventPayload(input: { baseRef: string; headSha?: string }) {
    writeFileSync(
      eventPath,
      JSON.stringify({
        pull_request: {
          number: 1,
          head: { ref: "feature", sha: input.headSha ?? featureSha },
          base: { ref: input.baseRef },
        },
      }),
    );
  }

  function createContext(env: Record<string, string>): Context {
    return {
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_SHA: mergeSha,
        ...env,
      },
    };
  }

  beforeEach(() => {
    cwd = process.cwd();
    root = mkdtempSync(join(tmpdir(), "argos-github-actions-test-"));
    repoDir = join(root, "repo");
    eventPath = join(root, "event.json");

    const bareDir = join(root, "origin.git");
    execFileSync("git", ["init", "--bare", bareDir]);
    execFileSync("git", ["init", repoDir]);
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", repoDir, ...args])
        .toString()
        .trim();
    git("remote", "add", "origin", bareDir);
    git("config", "user.email", "test@argos-ci.com");
    git("config", "user.name", "Argos Test");

    // `main` has two commits, `feature` branches off it with one commit, then
    // `main` moves forward — the base branch changes the pull request does not
    // contain yet.
    git("commit", "--allow-empty", "-m", "base 0");
    git("commit", "--allow-empty", "-m", "base 1");
    git("branch", "-M", "main");
    forkSha = git("rev-parse", "HEAD");
    git("checkout", "-b", "feature");
    git("commit", "--allow-empty", "-m", "feature 1");
    featureSha = git("rev-parse", "HEAD");
    git("checkout", "main");
    git("commit", "--allow-empty", "-m", "base 2");
    mainSha = git("rev-parse", "HEAD");
    git("push", "origin", "main", "feature");

    // What GitHub checks out on a "pull_request" event: `feature` merged into
    // the tip of `main`, checked out in detached HEAD.
    git("checkout", "--detach", mainSha);
    git("merge", "--no-ff", "-m", "Merge feature into main", featureSha);
    mergeSha = git("rev-parse", "HEAD");

    writeEventPayload({ baseRef: "main" });
    process.chdir(repoDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
  });

  it("returns the base commit merged into the test-merge commit", async () => {
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({}),
    );
    expect(sha).toBe(mainSha);
  });

  it("falls back to the merge base when the pull request head is checked out", async () => {
    // A workflow checking out `github.event.pull_request.head.sha` instead of
    // the test-merge commit: the screenshots don't contain the base branch
    // changes, so the merge base is the right base commit.
    execFileSync("git", ["-C", repoDir, "checkout", "--detach", featureSha]);
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({}),
    );
    expect(sha).toBe(forkSha);
  });

  it("falls back to the merge base on another event", async () => {
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({ GITHUB_EVENT_NAME: "push" }),
    );
    expect(sha).toBe(forkSha);
  });

  it("falls back to the merge base when the base is not the pull request base branch", async () => {
    // A build with a "referenceBranch" overriding the pull request base branch.
    writeEventPayload({ baseRef: "release" });
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({}),
    );
    expect(sha).toBe(forkSha);
  });

  it("falls back to the merge base when the event payload is missing", async () => {
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({ GITHUB_EVENT_PATH: join(root, "missing.json") }),
    );
    expect(sha).toBe(forkSha);
  });

  it("returns the base commit when the payload head is stale", async () => {
    // A push landing between the event and the merge ref being recomputed
    // leaves "pull_request.head.sha" behind the test-merge commit that is
    // actually checked out. GITHUB_REF still names the merge ref, so the build
    // must be baselined against the commit GitHub merged in.
    writeEventPayload({ baseRef: "main", headSha: forkSha });
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({ GITHUB_REF: "refs/pull/1/merge" }),
    );
    expect(sha).toBe(mainSha);
  });

  it("falls back to the merge base on a stale payload without the merge ref", async () => {
    // Without GITHUB_REF naming the merge ref, the payload is the only way to
    // tell GitHub's test merge apart from a merge the author made.
    writeEventPayload({ baseRef: "main", headSha: forkSha });
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({}),
    );
    expect(sha).toBe(forkSha);
  });

  it("ignores the merge ref of another pull request", async () => {
    writeEventPayload({ baseRef: "main", headSha: forkSha });
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({ GITHUB_REF: "refs/pull/2/merge" }),
    );
    expect(sha).toBe(forkSha);
  });

  it("falls back to the merge base when the head is not a merge commit", async () => {
    // The merge ref alone must not be trusted when the checkout is not a merge:
    // a single-parent commit has no base branch tip to read.
    execFileSync("git", ["-C", repoDir, "checkout", "--detach", featureSha]);
    const sha = await service.getMergeBaseCommitSha(
      { base: "main", head: "feature" },
      createContext({
        GITHUB_SHA: featureSha,
        GITHUB_REF: "refs/pull/1/merge",
      }),
    );
    expect(sha).toBe(forkSha);
  });
});
