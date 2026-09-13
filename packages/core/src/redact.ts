/**
 * What `DEBUG=@argos-ci/core` is allowed to print.
 *
 * The documentation tells users to rerun a failing command with that flag and
 * share the output, and CI writes it to build logs that are world-readable on
 * public repositories. Everything the debug log prints is therefore effectively
 * published — which is how the Argos repository token, the `GITHUB_TOKEN` and
 * the OIDC request token came to leak (GHSA-28pg-v3hp-9g7f).
 */

/** Printed in place of a value that must not be published. */
const REDACTED = "[redacted]";

/**
 * Property names that hold a credential, wherever they sit. Matched loosely on
 * purpose: a false positive costs one line of debug output, a miss costs a
 * token.
 */
const SECRET_KEY_REGEX =
  /token|secret|password|passwd|credential|api[-_]?key|authorization|cookie|signature/i;

/**
 * Environment variables whose value the debug log keeps: the ones CI detection
 * and the configuration actually read. Every other variable — a project's own
 * secrets included — is reported by name only, which is all that "why wasn't my
 * CI detected?" needs.
 */
const CI_ENV_PREFIXES = [
  "ACTIONS_",
  "ARGOS_",
  "BITRISE",
  "BUILDKITE",
  "CIRCLE",
  "CI_",
  "GITHUB_",
  "GITLAB_",
  "HEROKU_",
  "TRAVIS",
];

/** CI variables that are not covered by a prefix. */
const CI_ENV_NAMES = ["CI", "DISABLE_GITHUB_TOKEN_WARNING"];

function isSecretKey(key: string): boolean {
  return SECRET_KEY_REGEX.test(key);
}

function isCiVariable(name: string): boolean {
  return (
    CI_ENV_NAMES.includes(name) ||
    CI_ENV_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function redactValue(value: unknown, seen: Map<object, unknown>): unknown {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  // A shape pointing back at itself is copied once and then shared, so a cycle
  // stays a cycle instead of becoming an endless walk.
  const copied = seen.get(value);
  if (copied !== undefined) {
    return copied;
  }

  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const item of value) {
      copy.push(redactValue(item, seen));
    }
    return copy;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const [key, item] of Object.entries(value)) {
    copy[key] = isSecretKey(key) && item ? REDACTED : redactValue(item, seen);
  }
  return copy;
}

/**
 * Copy `value` with every credential-looking property replaced.
 *
 * Only plain objects and arrays are walked: anything else — an `Error`, a
 * `Buffer`, a class instance — is passed through untouched so the debug output
 * keeps rendering it as it always did. An empty value is kept as it is too: a
 * `token: null` says the token was never resolved, which is worth seeing.
 */
export function redactSecrets(value: unknown): unknown {
  return redactValue(value, new Map());
}

/**
 * The environment as the debug log may show it: CI variables keep their value,
 * every other one is reduced to its name.
 */
export function redactEnv(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }
    redacted[name] =
      isCiVariable(name) && !isSecretKey(name) ? value : REDACTED;
  }
  return redacted;
}
