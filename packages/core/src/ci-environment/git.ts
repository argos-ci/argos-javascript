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

function getMergeBaseCommitShaWithDepth(input: {
  base: string;
  head: string;
  depth: number;
}): string | null {
  execSync(
    `git fetch --update-head-ok --depth ${input.depth} origin ${input.head}:${input.head}`,
  );
  execSync(
    `git fetch --update-head-ok --depth ${input.depth} origin ${input.base}:${input.base}`,
  );
  const mergeBase = execSync(`git merge-base ${input.head} ${input.base}`)
    .toString()
    .trim();
  return mergeBase || null;
}

export function getMergeBaseCommitSha(input: {
  base: string;
  head: string;
}): string | null {
  let depth = 200;

  while (depth < 1000) {
    const mergeBase = getMergeBaseCommitShaWithDepth({
      depth,
      ...input,
    });
    if (mergeBase) {
      return mergeBase;
    }
    depth += 200;
  }

  if (isDebugEnabled) {
    const headShas = listShas(input.head);
    const baseShas = listShas(input.base);
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
  execSync(`git fetch --depth=${limit} origin ${input.sha}`);
  return listShas(input.sha, limit);
}
