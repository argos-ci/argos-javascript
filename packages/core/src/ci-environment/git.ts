import { execSync } from "node:child_process";

/**
 * Returns the head commit.
 */
export const head = () => {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return null;
  }
};

/**
 * Returns the current branch.
 */
export const branch = () => {
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
};
