import { APIError } from "@argos-ci/api-client";

import { CliError } from "./cli-error";
import {
  resolveBuildTarget,
  type AuthMode,
  type BuildTarget,
  type TargetOptions,
} from "./target";

export type BaseCommandOptions = TargetOptions & { json?: boolean | undefined };

const USER_AUTH_HINT =
  "Ensure your token is a personal access token with access to this project. " +
  "Project tokens (ARGOS_TOKEN in CI) can read build data but cannot perform review or comment actions.";

const SCOPE_HINT =
  "Your `argos login` session was granted before the CLI asked for this permission. " +
  "Run `argos login` again to grant it.";

/**
 * A scope rejection, as opposed to any other 403: the token is valid and the
 * user is allowed, it was simply issued without the permission this endpoint
 * needs. Matched on the message because that is all the API returns — see
 * `assertOAuthScopes` in the Argos backend.
 */
function isInsufficientScope(error: APIError): boolean {
  return error.status === 403 && /insufficient scope/i.test(error.message);
}

/**
 * Print an error and exit. {@link CliError} and {@link APIError} messages are
 * shown as-is; permission failures get an extra hint — how to grant a missing
 * scope, or which token type the command needs.
 */
export function handleCliError(error: unknown, auth?: AuthMode): never {
  let message: string;
  if (error instanceof CliError || error instanceof APIError) {
    message = error.message;
    if (error instanceof APIError && isInsufficientScope(error)) {
      // A missing scope is never fixed by switching token type, so this hint
      // replaces the one about tokens rather than piling on next to it.
      message += `\n${SCOPE_HINT}`;
    } else if (
      auth === "user" &&
      error instanceof APIError &&
      (error.status === 401 || error.status === 403)
    ) {
      message += `\n${USER_AUTH_HINT}`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }
  console.error(`Error: ${message}`);
  process.exit(1);
}

/** Print a command result as pretty JSON or human-readable text. */
export function output<T>(
  data: T,
  options: { json?: boolean | undefined },
  format: (data: T) => string,
): void {
  console.log(options.json ? JSON.stringify(data, null, 2) : format(data));
}

/**
 * Run a build-scoped command end to end: resolve the build target, run the
 * handler, print the result, and turn any failure into a clean CLI error.
 */
export async function runBuildAction<T>(opts: {
  reference: string;
  options: BaseCommandOptions;
  auth: AuthMode;
  handler: (target: BuildTarget) => Promise<T>;
  format: (data: T) => string;
}): Promise<void> {
  try {
    const target = await resolveBuildTarget(opts.reference, opts.options, {
      auth: opts.auth,
    });
    const data = await opts.handler(target);
    output(data, opts.options, opts.format);
  } catch (error) {
    handleCliError(error, opts.auth);
  }
}
