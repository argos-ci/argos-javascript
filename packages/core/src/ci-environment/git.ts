import { execSync } from "node:child_process";

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

function getMergeBaseCommitShaWithDepth(input: {
  base: string;
  head: string;
  depth: number;
}): string | null {
  try {
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
  } catch {
    return null;
  }
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
  return null;
}

export function listParentCommits(input: { sha: string }): string[] | null {
  try {
    execSync(`git fetch --depth=200 origin ${input.sha}`);
    const raw = execSync(`git log --format="%H" --max-count=200 ${input.sha}`);
    const shas = raw.toString().trim().split("\n");
    return shas;
  } catch {
    return null;
  }
}
