import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * How long `gh` gets to answer before we stop waiting.
 *
 * `gh pr view` makes a network call, and an upload must not hang on it: this is
 * a convenience that saves typing a number, not a step the upload depends on.
 * A slow or unreachable GitHub costs the caller two seconds and then the upload
 * proceeds unattached, which is exactly what passing nothing would have done.
 */
const GH_TIMEOUT_MS = 2000;

/**
 * The number of the pull request for the current branch, discovered with the
 * GitHub CLI, or `null` when there is nothing to discover.
 *
 * Every ordinary reason to come back empty — `gh` not installed, not signed in,
 * not inside a repository, no pull request open for this branch yet — is one of
 * them. None is an error: they all mean "no pull request to attach to", which is
 * a perfectly good state for an upload to be in. The media is uploaded and its
 * share URL printed either way.
 *
 * `execFile`, not `exec`: no shell is involved, so nothing here can be widened
 * by a repository or branch name containing shell metacharacters.
 */
export async function detectPullRequestNumber(): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      "gh",
      ["pr", "view", "--json", "number", "--jq", ".number"],
      { timeout: GH_TIMEOUT_MS, windowsHide: true },
    );

    const parsed = Number.parseInt(stdout.trim(), 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}
