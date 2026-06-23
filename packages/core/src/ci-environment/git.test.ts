import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { branch, getMergeBaseCommitSha, getRepositoryURL, head } from "./git";

describe("#head", () => {
  it("returns the current commit", () => {
    expect(head()).toMatch(/^[0-9a-f]{40}$/);
  });
});

// These tests are just examples to run locally
// Hard to make it work reliably in CI

describe.skip("#branch", () => {
  it("returns the current branch", () => {
    expect(branch()).toBe("main");
  });
});

describe.skip("#getRepositoryURL", () => {
  it("returns the repository URL", () => {
    expect(getRepositoryURL()).toBe(
      "git@github.com:argos-ci/argos-javascript.git",
    );
  });
});

describe("#getMergeBaseCommitSha (command injection)", () => {
  let cwd: string;
  let repoDir: string;
  let markerFile: string;

  beforeEach(() => {
    cwd = process.cwd();
    const root = mkdtempSync(join(tmpdir(), "argos-git-test-"));
    repoDir = join(root, "repo");
    markerFile = join(root, "pwned");

    // A bare repo acts as the "origin" remote so that git fetch has a
    // reachable target.
    const bareDir = join(root, "origin.git");
    execFileSync("git", ["init", "--bare", bareDir]);
    execFileSync("git", ["init", repoDir]);
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", repoDir, ...args]);
    git("remote", "add", "origin", bareDir);

    process.chdir(repoDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(join(repoDir, ".."), { recursive: true, force: true });
  });

  it("does not execute shell metacharacters in the branch name", async () => {
    // Mirrors the GHSA-4x45-gxvp-6283 PoC: a ref containing $() command
    // substitution must be passed to git as a literal argument, never
    // evaluated by a shell.
    const malicious = `main$(touch ${markerFile})`;

    // git will fail because the ref does not exist; that's expected. What
    // matters is that the injected `touch` never runs.
    try {
      await getMergeBaseCommitSha({ base: malicious, head: malicious });
    } catch {
      // Ignore the git failure.
    }

    expect(existsSync(markerFile)).toBe(false);
  });
});

describe("#getMergeBaseCommitSha (lock contention)", () => {
  let cwd: string;
  let root: string;
  let repoDir: string;
  let lockFile: string;

  beforeEach(() => {
    cwd = process.cwd();
    root = mkdtempSync(join(tmpdir(), "argos-git-lock-test-"));
    repoDir = join(root, "repo");
    lockFile = join(repoDir, ".git", "shallow.lock");

    const bareDir = join(root, "origin.git");
    execFileSync("git", ["init", "--bare", bareDir]);
    execFileSync("git", ["init", repoDir]);
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", repoDir, ...args]);
    git("remote", "add", "origin", bareDir);
    git("config", "user.email", "test@argos-ci.com");
    git("config", "user.name", "Argos Test");
    git("commit", "--allow-empty", "-m", "initial");
    git("branch", "-M", "main");
    git("push", "origin", "main");

    process.chdir(repoDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
  });

  it("retries and recovers once the lock is released", async () => {
    // Simulate a concurrent git process holding the shallow lock.
    writeFileSync(lockFile, "");

    // Release the lock shortly after, while gitFetch is retrying.
    const timer = setTimeout(() => rmSync(lockFile, { force: true }), 700);

    try {
      const sha = await getMergeBaseCommitSha({ base: "main", head: "main" });
      expect(sha).toMatch(/^[0-9a-f]{40}$/);
      expect(existsSync(lockFile)).toBe(false);
    } finally {
      clearTimeout(timer);
    }
  });
});
