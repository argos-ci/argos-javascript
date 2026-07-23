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
 * Check whether a git fetch error means the requested ref does not exist on
 * the remote, e.g. a branch that has not been pushed to origin yet.
 */
function checkIsMissingRemoteRefError(error: unknown): boolean {
  return getGitErrorOutput(error)
    .toLowerCase()
    .includes("couldn't find remote ref");
}

/**
 * Check that a ref exists in the local repository and points to a commit.
 */
function checkLocalRefExists(ref: string): boolean {
  try {
    execFileSync("git", [
      "rev-parse",
      "--verify",
      "--quiet",
      `${ref}^{commit}`,
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ref usable in the merge-base computation.
 */
type MergeBaseRef = {
  /**
   * Ref to pass to `git merge-base`, or `null` when the ref is unavailable
   * both on origin and locally.
   */
  ref: string | null;
  /** Whether fetching again with a greater depth can deepen the history. */
  fetchable: boolean;
};

/**
 * Fetch a ref from origin to make it available for the merge-base computation.
 *
 * When the fetch fails, fall back to the history available locally instead of
 * failing the whole upload — the merge base is only used to find the baseline
 * and a build without baseline is better than no build at all:
 * - When the ref is missing on origin (e.g. a branch not pushed yet, common on
 *   a first local run), prefer the local ref, which is the exact state being
 *   built. Expected, so only logged in debug mode.
 * - For other failures (network, authentication…), prefer the target of a
 *   previous fetch (the freshest known remote state) and surface a warning.
 */
async function fetchMergeBaseRef(input: {
  ref: string;
  depth: number;
  target: string;
}): Promise<MergeBaseRef> {
  try {
    await gitFetch(input);
    return { ref: input.target, fetchable: true };
  } catch (error) {
    const isMissingRemoteRef = checkIsMissingRemoteRefError(error);
    if (isMissingRemoteRef) {
      debug(
        `Ref "${input.ref}" not found on origin, falling back to local history`,
        getGitErrorOutput(error),
      );
    } else {
      console.warn(
        `Argos failed to fetch "${input.ref}" from origin, falling back to the local history to find the merge base.`,
      );
      debug(`git fetch failed for "${input.ref}"`, getGitErrorOutput(error));
    }
    const candidates = isMissingRemoteRef
      ? [input.ref, input.target]
      : [input.target, input.ref];
    const ref = candidates.find((ref) => checkLocalRefExists(ref)) ?? null;
    return { ref, fetchable: false };
  }
}

/**
 * Get the merge base commit SHA.
 * Fetch both base and head with depth and then run merge base.
 * Try to find a merge base with a depth of 1000 max.
 *
 * Never fails when a ref can't be fetched from origin: falls back to the local
 * history and returns `null` when no merge base can be found, which resolves
 * to a build without baseline (see `resolveBaseline`).
 */
export async function getMergeBaseCommitSha(input: {
  base: string;
  head: string;
}): Promise<string | null> {
  const argosBaseRef = `argos/${input.base}`;
  const argosHeadRef = `argos/${input.head}`;

  let head: MergeBaseRef | null = null;
  let base: MergeBaseRef | null = null;

  for (let depth = 200; depth < 1000; depth += 200) {
    if (!head || head.fetchable) {
      head = await fetchMergeBaseRef({
        ref: input.head,
        depth,
        target: argosHeadRef,
      });
    }
    if (!base || base.fetchable) {
      base = await fetchMergeBaseRef({
        ref: input.base,
        depth,
        target: argosBaseRef,
      });
    }

    // A ref unavailable both on origin and locally: no merge base can be found.
    if (!head.ref || !base.ref) {
      debug(
        `No usable ref for "${!head.ref ? input.head : input.base}", no merge base`,
      );
      return null;
    }

    const mergeBase = gitMergeBase({ base: base.ref, head: head.ref });
    if (mergeBase) {
      return mergeBase;
    }

    // No ref can be deepened: fetching again would not bring more history.
    if (!head.fetchable && !base.fetchable) {
      break;
    }
  }

  if (isDebugEnabled && head?.ref && base?.ref) {
    const headShas = listShas(head.ref);
    const baseShas = listShas(base.ref);
    debug(`No merge base found for ${input.head} and ${input.base}`);
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

/**
 * List the ancestor commits of a commit, ordered from the closest to the
 * furthest ancestor, up to `limit` commits. The commit itself is excluded.
 *
 * The history is deepened with a shallow fetch so this works on the shallow
 * clones typically used in CI. When the commit is not on the remote (e.g. not
 * pushed yet) or the fetch fails, we fall back to whatever local history is
 * available; when the commit is unknown locally too, we return an empty list.
 */
export async function listAncestorCommits(input: {
  sha: string;
  limit: number;
}): Promise<string[]> {
  // Fetch one extra commit since the commit itself is excluded from the result.
  const depth = input.limit + 1;
  try {
    await runGitFetch([`--depth=${depth}`, "origin", input.sha]);
  } catch (error) {
    debug(
      `Failed to deepen history for ${input.sha}, using local history`,
      getGitErrorOutput(error),
    );
  }
  try {
    return listShas(input.sha, depth).slice(1);
  } catch (error) {
    debug(`Failed to list ancestors of ${input.sha}`, getGitErrorOutput(error));
    return [];
  }
}
