import type { ArgosAPIClient } from "@argos-ci/api-client";
import { getStoredToken } from "../auth";
import { createApiClient, unwrap } from "./api";
import {
  parseBuildReferenceOrFail,
  type BuildReference,
} from "./build-reference";
import { fail } from "./cli-error";
import { parseProjectPathOrFail, type ProjectPath } from "./project";

/**
 * Authentication mode for a build-scoped command:
 *
 * - `project`: read-only build data. Accepts a project token or a personal
 *   access token (`--token` / `ARGOS_TOKEN` / `argos login`); the project path
 *   is resolved from the `/project` endpoint when not provided in the reference
 *   or via `--project`.
 * - `user`: review and comment actions. Requires a personal access token
 *   (`--token` / `ARGOS_TOKEN` / `argos login`); the project path must come from
 *   the build URL or `--project`.
 */
export type AuthMode = "project" | "user";

export type TargetOptions = {
  token?: string | undefined;
  project?: string | undefined;
};

/** A resolved build, ready to drive API calls. */
export type BuildTarget = ProjectPath & {
  client: ArgosAPIClient;
  /** Build number as a string, ready to use as a path parameter. */
  buildNumber: string;
};

/**
 * Resolve the API token, preferring an explicit token (`--token` /
 * `ARGOS_TOKEN`) over the one stored by `argos login`.
 */
export async function resolveToken(options: TargetOptions): Promise<string> {
  const token =
    options.token || process.env["ARGOS_TOKEN"] || (await getStoredToken());
  if (!token) {
    fail(
      "No Argos token found. Use --token, set ARGOS_TOKEN, or run `argos login`.",
    );
  }
  return token;
}

function explicitProjectPath(
  reference: BuildReference,
  options: TargetOptions,
): ProjectPath | null {
  if (reference.owner && reference.project) {
    return { owner: reference.owner, project: reference.project };
  }
  const project = options.project || process.env["ARGOS_PROJECT"];
  if (project) {
    return parseProjectPathOrFail(project);
  }
  return null;
}

/**
 * Resolve a build reference into a ready-to-use {@link BuildTarget}: an
 * authenticated client and the `owner`, `project` and `buildNumber` needed by
 * every build-scoped endpoint.
 */
export async function resolveBuildTarget(
  reference: string,
  options: TargetOptions,
  { auth }: { auth: AuthMode },
): Promise<BuildTarget> {
  const parsed = parseBuildReferenceOrFail(reference);
  const buildNumber = String(parsed.buildNumber);
  const client = createApiClient(await resolveToken(options));

  if (auth === "user") {
    const projectPath = explicitProjectPath(parsed, options);
    if (!projectPath) {
      fail(
        "--project <owner/project> is required for build-number references.",
      );
    }
    return { client, ...projectPath, buildNumber };
  }

  const projectPath = explicitProjectPath(parsed, options);
  if (projectPath) {
    return { client, ...projectPath, buildNumber };
  }

  // Fall back to the token's own project.
  const project = unwrap(await client.GET("/project"));
  return {
    client,
    owner: project.account.slug,
    project: project.name,
    buildNumber,
  };
}
