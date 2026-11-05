import { APIError } from "@argos-ci/api-client";

import { CliError } from "./cli-error";
import { isRequestedOAuthScope, OAUTH_ADMIN_SCOPES } from "./oauth";
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
 * A scope rejection, as opposed to any other 403: the token is valid and the
 * user is allowed, it was simply issued without the permission this endpoint
 * needs. Matched on the message because that is all the API returns — see
 * `assertOAuthScopes` in the Argos backend.
 */
function isInsufficientScope(error: APIError): boolean {
  return error.status === 403 && /insufficient scope/i.test(error.message);
}

/**
 * The scopes named by a scope rejection ("Insufficient scope. This endpoint
 * requires: account:admin."). Anything not shaped like a scope is dropped, so
 * the hint never echoes arbitrary server text.
 */
function parseRequiredScopes(message: string): string[] {
  const match = /requires:\s*([^.]*)/i.exec(message);
  if (!match?.[1]) {
    return [];
  }
  return match[1]
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope) => /^[a-z]+(?::[a-z]+)?$/.test(scope));
}

function formatScopes(scopes: readonly string[]): string {
  return scopes.map((scope) => `\`${scope}\``).join(", ");
}

/**
 * How to get the scopes an `argos login` session is missing. A session lacks a
 * scope for one of three reasons, each with its own fix: the CLI never asks for
 * it (only a personal access token helps), it is an admin scope left out by the
 * consent screen's default access level, or the session was granted before the
 * CLI asked for it.
 */
export function getScopeHint(message: string): string {
  const required = parseRequiredScopes(message);
  if (required.length === 0) {
    return "Run `argos login` again to grant the permission this command needs.";
  }
  const ungrantable = required.filter((scope) => !isRequestedOAuthScope(scope));
  if (ungrantable.length > 0) {
    return (
      `\`argos login\` cannot grant ${formatScopes(ungrantable)}. ` +
      "Use a personal access token instead (`--token` or `ARGOS_TOKEN`)."
    );
  }
  const needsAdmin = required.some(
    (scope) => isRequestedOAuthScope(scope) && OAUTH_ADMIN_SCOPES.has(scope),
  );
  if (needsAdmin) {
    return (
      `Your \`argos login\` session does not include ${formatScopes(required)}. ` +
      'Run `argos login` again and choose "Admin" access on the consent screen to grant it.'
    );
  }
  return (
    `Your \`argos login\` session does not include ${formatScopes(required)}. ` +
    "Run `argos login` again to grant it."
  );
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
      message += `\n${getScopeHint(error.message)}`;
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
