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
  const head = input.head || `HEAD`;
  try {
    execSync(`git fetch origin ${head}:${head} --depth ${input.depth}`);
    execSync(
      `git fetch origin ${input.base}:${input.base} --depth ${input.depth}`,
    );
    const mergeBase = execSync(`git merge-base ${head} ${input.base}`)
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
  let depth = 50;
  while (depth < 1000) {
    const mergeBase = getMergeBaseCommitShaWithDepth({
      depth,
      ...input,
    });
    if (mergeBase) {
      return mergeBase;
    }
    depth += 50;
  }
  return null;
}
