import { execSync } from "node:child_process";
import { debug, isDebugEnabled } from "../debug";

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
    return execSync(`git merge-base ${input.head} ${input.base}`)
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
 * Run git fetch with a specific ref and depth.
 */
function gitFetch(input: { ref: string; depth: number; target: string }) {
  execSync(
    `git fetch --force --update-head-ok --depth ${input.depth} origin ${input.ref}:${input.target}`,
  );
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
export function getMergeBaseCommitSha(input: {
  base: string;
  head: string;
}): string | null {
  let depth = 200;

  const argosBaseRef = `argos/${input.base}`;
  const argosHeadRef = `argos/${input.head}`;

  while (depth < 1000) {
    gitFetch({ ref: input.head, depth, target: argosHeadRef });
    gitFetch({ ref: input.base, depth, target: argosBaseRef });
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
  const maxCountArg = maxCount ? `--max-count=${maxCount}` : "";
  const raw = execSync(`git log --format="%H" ${maxCountArg} ${path}`.trim());
  const shas = raw.toString().trim().split("\n");
  return shas;
}

export function listParentCommits(input: { sha: string }): string[] | null {
  const limit = 200;
  try {
    execSync(`git fetch --depth=${limit} origin ${input.sha}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not our ref")) {
      return [];
    }
  }
  return listShas(input.sha, limit);
}
