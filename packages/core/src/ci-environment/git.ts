import { execFile, execFileSync, execSync } from "node:child_process";
import { promisify } from "node:util";
import pRetry from "p-retry";
import { debug, isDebugEnabled } from "../debug";

const execFileAsync = promisify(execFile);

/**
 * Check if the current directory is a git repository.
 */
export function checkIsGitRepository() {
  try {
    return (
      execSync("git rev-parse --is-inside-work-tree").toString().trim() ===
      "true"
    );
  } catch {
    return false;
  }
}

/**
 * Returns the head commit.
 */
export function head() {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return null;
  }
}

/**
 * Returns the current branch.
 */
export function branch() {
  try {
    const headRef = execSync("git rev-parse --abbrev-ref HEAD")
      .toString()
      .trim();

    if (headRef === "HEAD") {
      return null;
    }

    return headRef;
  } catch {
    return null;
  }
}

/**
 * Returns the repository URL.
 */
export function getRepositoryURL() {
  try {
    const url = execSync("git config --get remote.origin.url")
      .toString()
      .trim();
    return url;
  } catch {
    return null;
  }
}

/**
 * Run git merge-base command.
 */
function gitMergeBase(input: { base: string; head: string }) {
  try {
    return execFileSync("git", ["merge-base", input.head, input.base])
      .toString()
      .trim();
  } catch (error) {
    // When a merge base is not found, it returns a status of 1 with no error.
    // In this case it's not a fatal error, just no merge-base found.
    if (
      checkIsExecError(error) &&
      error.status === 1 &&
      error.stderr.toString() === ""
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Combine an error's message and stderr into a single searchable string.
 */
function getGitErrorOutput(error: unknown): string {
  if (!(error instanceof Error)) {
    return "";
  }
  const stderr = "stderr" in error ? String(error.stderr ?? "") : "";
  return `${error.message}\n${stderr}`;
}

/**
 * Check whether a git error is a `.git/*.lock` contention error.
 * This happens when another git process is running concurrently (e.g. parallel
 * CI shards fetching the same repository) or when a stale lock was left behind
 * by a crashed git process.
 */
function checkIsGitLockError(error: unknown): boolean {
  const output = getGitErrorOutput(error);
  return (
    output.includes(".lock': File exists") ||
    output.includes("Another git process seems to be running")
  );
}

/**
 * Run `git fetch` with the given arguments.
 *
 * Retries on lock contention (`.git/shallow.lock` "File exists") with an
 * exponential backoff, since this is usually a transient conflict with another
 * git process and resolves once that process releases the lock.
 */
function runGitFetch(args: string[]) {
  return pRetry(() => execFileAsync("git", ["fetch", ...args]), {
    retries: 3,
    minTimeout: 500,
    shouldRetry: ({ error }) => checkIsGitLockError(error),
    onFailedAttempt: ({ error, retriesLeft, retryDelay }) => {
      if (checkIsGitLockError(error) && retriesLeft > 0) {
        debug(
          `git fetch failed on lock contention, retrying in ${retryDelay}ms (${retriesLeft} left)`,
        );
      }
    },
  });
}

/**
 * Run git fetch with a specific ref and depth.
 */
async function gitFetch(input: { ref: string; depth: number; target: string }) {
  await runGitFetch([
    "--force",
    "--update-head-ok",
    "--depth",
    String(input.depth),
    "origin",
    `${input.ref}:${input.target}`,
  ]);
}

/**
 * Check if an error is an exec error that includes stderr.
 */
function checkIsExecError(
  error: unknown,
): error is Error & { stderr: Buffer; status: number } {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    "stderr" in error &&
    Buffer.isBuffer(error.stderr)
  );
}

/**
 * Get the merge base commit SHA.
 * Fetch both base and head with depth and then run merge base.
 * Try to find a merge base with a depth of 1000 max.
 */
export async function getMergeBaseCommitSha(input: {
  base: string;
  head: string;
}): Promise<string | null> {
  let depth = 200;

  const argosBaseRef = `argos/${input.base}`;
  const argosHeadRef = `argos/${input.head}`;

  while (depth < 1000) {
    await gitFetch({ ref: input.head, depth, target: argosHeadRef });
    await gitFetch({ ref: input.base, depth, target: argosBaseRef });
    const mergeBase = gitMergeBase({
      base: argosBaseRef,
      head: argosHeadRef,
    });
    if (mergeBase) {
      return mergeBase;
    }
    depth += 200;
  }

  if (isDebugEnabled) {
    const headShas = listShas(argosHeadRef);
    const baseShas = listShas(argosBaseRef);
    debug(
      `No merge base found for ${input.head} and ${input.base} with depth ${depth}`,
    );
    debug(
      `Found ${headShas.length} commits in ${input.head}: ${headShas.join(", ")}`,
    );
    debug(
      `Found ${baseShas.length} commits in ${input.base}: ${baseShas.join(", ")}`,
    );
  }

  return null;
}

function listShas(path: string, maxCount?: number): string[] {
  const args = ["log", "--format=%H"];
  if (maxCount) {
    args.push(`--max-count=${maxCount}`);
  }
  args.push(path);
  const raw = execFileSync("git", args);
  const shas = raw.toString().trim().split("\n");
  return shas;
}

export async function listParentCommits(input: {
  sha: string;
}): Promise<string[] | null> {
  const limit = 200;
  try {
    await runGitFetch([`--depth=${limit}`, "origin", input.sha]);
  } catch (error) {
    if (getGitErrorOutput(error).includes("not our ref")) {
      return [];
    }
  }
  return listShas(input.sha, limit);
}
