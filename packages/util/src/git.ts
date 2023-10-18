import { exec } from "node:child_process";

let cached: Promise<string>;

/**
 * Get the top level of the git repository.
 */
export function getGitRepositoryPath() {
  if (!cached) {
    cached = new Promise<string>((resolve, reject) => {
      exec("git rev-parse --show-toplevel", (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(stderr);
          return;
        }
        resolve(stdout.trim());
      });
    });
  }
  return cached;
}
