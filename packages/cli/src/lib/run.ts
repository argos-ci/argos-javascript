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

/**
 * Print an error and exit. {@link CliError} and {@link APIError} messages are
 * shown as-is; permission failures on user-authenticated commands get an extra
 * hint about token types.
 */
export function handleCliError(error: unknown, auth?: AuthMode): never {
  let message: string;
  if (error instanceof CliError || error instanceof APIError) {
    message = error.message;
    if (
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
