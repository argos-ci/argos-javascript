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

function isSecretKey(key: string): boolean {
  return SECRET_KEY_REGEX.test(key);
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

  const isArray = Array.isArray(value);
  if (!isArray && !isPlainObject(value)) {
    return value;
  }

  const copy: unknown[] | Record<string, unknown> = isArray ? [] : {};
  seen.set(value, copy);

  // Walked through its property descriptors rather than by reading it: turning
  // the debug flag on must not run a caller's getter, let alone throw inside
  // one and take the upload down with it. An accessor is copied as it is and
  // stays uncalled — `util.inspect` renders it as `[Getter]`, which is what the
  // debug output showed before anything was redacted at all.
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if (!descriptor.enumerable) {
      continue;
    }
    if (!("value" in descriptor)) {
      Object.defineProperty(copy, key, descriptor);
      continue;
    }
    const item: unknown = descriptor.value;
    Object.defineProperty(copy, key, {
      ...descriptor,
      value: isSecretKey(key) && item ? REDACTED : redactValue(item, seen),
    });
  }
  return copy;
}

/**
 * Copy `value` with every credential-looking property replaced.
 *
 * Only plain objects and arrays are walked, and only through their property
 * descriptors, so no getter is ever called. Anything else — an `Error`, a
 * `Buffer`, a class instance — is passed through untouched, so the debug output
 * keeps rendering it as it always did. An empty value is kept as it is too: a
 * `token: null` says the token was never resolved, which is worth seeing.
 */
export function redactSecrets(value: unknown): unknown {
  return redactValue(value, new Map());
}
