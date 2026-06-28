import { fail } from "./cli-error";

/**
 * A build, identified by its number and — when the reference was a full URL —
 * the project it belongs to.
 */
export type BuildReference = {
  buildNumber: number;
  owner?: string;
  project?: string;
};

const BUILD_URL_REGEXP =
  /^https:\/\/app\.argos-ci\.(?:com|dev(?::\d+)?)\/(?<owner>[^/?#]+)\/(?<project>[^/?#]+)\/builds\/(?<buildNumber>\d+)(?:\/?$|[?#])/;

/**
 * Parse a build reference, accepting either a bare build number (`"1234"`) or a
 * full Argos build URL. Returns `null` when the input is neither.
 */
export function parseBuildReference(reference: string): BuildReference | null {
  const asNumber = Number(reference);
  if (Number.isInteger(asNumber) && asNumber > 0) {
    return { buildNumber: asNumber };
  }

  const match = reference.match(BUILD_URL_REGEXP);
  if (match?.groups) {
    return {
      owner: match.groups.owner,
      project: match.groups.project,
      buildNumber: Number(match.groups.buildNumber),
    };
  }

  return null;
}

/**
 * Like {@link parseBuildReference} but aborts the command with a clear message
 * when the reference is invalid.
 */
export function parseBuildReferenceOrFail(reference: string): BuildReference {
  const parsed = parseBuildReference(reference);
  if (!parsed) {
    fail(
      `Build reference must be a valid build number or Argos build URL (https://app.argos-ci.com/.../builds/<number>), got "${reference}".`,
    );
  }
  return parsed;
}
