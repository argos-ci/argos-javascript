import { exec } from "node:child_process";

let cached: Promise<string | null>;

/**
 * Get the top level of the git repository.
 */
export function getGitRepositoryPath() {
  if (!cached) {
    cached = new Promise<string | null>((resolve) => {
      exec("git rev-parse --show-toplevel", (error, stdout, stderr) => {
        if (error) {
          resolve(null);
        }
        if (stderr) {
          resolve(null);
        }
        resolve(stdout.trim());
      });
    });
  }
  return cached;
}
