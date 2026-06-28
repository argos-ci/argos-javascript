import { fail } from "./cli-error";

/** A project, identified by its account slug and name. */
export type ProjectPath = {
  owner: string;
  project: string;
};

/**
 * Parse a `owner/project` slug. Returns `null` when it is not exactly two
 * non-empty segments.
 */
export function parseProjectPath(slug: string): ProjectPath | null {
  const parts = slug.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { owner: parts[0], project: parts[1] };
}

/**
 * Like {@link parseProjectPath} but aborts the command on an invalid slug.
 */
export function parseProjectPathOrFail(slug: string): ProjectPath {
  const parsed = parseProjectPath(slug);
  if (!parsed) {
    fail("--project must be in the format 'owner/project'.");
  }
  return parsed;
}
