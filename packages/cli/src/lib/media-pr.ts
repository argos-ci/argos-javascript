import { detectPullRequestNumber } from "./gh";
import { toPrNumber } from "../options";

/** What `media upload` was told about where the media belongs. */
export type MediaTargetOptions = {
  /** `--pr <number>`, `false` for `--no-pr`, absent when neither was passed. */
  pr?: string | false | undefined;
  branch?: string | undefined;
};

/**
 * Which pull request an upload publishes to.
 *
 * The everyday case is somebody on a branch with a pull request open, uploading
 * a screenshot of what they just changed — and looking the number up to type it
 * back is friction for something the environment already knows. So when the
 * caller says nothing, `gh` is asked.
 *
 * Only when the caller says *nothing*:
 *
 * - `--pr <n>` is taken as given.
 * - `--no-pr` opts out, for uploading a screenshot that has nothing to do with
 *   the branch that happens to be checked out.
 * - `--branch` is already an answer to this question. It stages the media for
 *   whatever pull request opens on that branch, which is the flow for one that
 *   does not exist yet — detecting a pull request over it would publish
 *   immediately and silently discard the staging that was asked for.
 *
 * Detection never fails an upload: every way it can come back empty — no `gh`,
 * not signed in, no pull request open yet — means "no pull request to attach
 * to", which is the same state as passing nothing. The media uploads and its
 * share URL prints either way.
 */
export async function resolveUploadPrNumber(
  options: MediaTargetOptions,
): Promise<number | undefined> {
  if (options.pr === false) {
    return undefined;
  }

  if (options.pr !== undefined) {
    return toPrNumber(options.pr);
  }

  if (options.branch !== undefined) {
    return undefined;
  }

  return (await detectPullRequestNumber()) ?? undefined;
}
