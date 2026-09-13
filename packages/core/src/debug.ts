import createDebug from "debug";

import { redactSecrets } from "./redact";

const KEY = "@argos-ci/core";

const logger = createDebug(KEY);

/**
 * Log a line under `DEBUG=@argos-ci/core`.
 *
 * Arguments are redacted on the way in: this output is pasted into public
 * issues and written to CI logs, so a credential reaching it is a published
 * credential (GHSA-28pg-v3hp-9g7f). Callers pass whole objects — parameters,
 * the resolved config, an API response — and must not have to remember which
 * of their fields is a secret.
 */
export const debug = (message: unknown, ...args: unknown[]): void => {
  if (!logger.enabled) {
    return;
  }
  logger(redactSecrets(message), ...args.map((arg) => redactSecrets(arg)));
};

export const isDebugEnabled = createDebug.enabled(KEY);

export const debugTime = (arg: string) => {
  if (isDebugEnabled) {
    console.time(arg);
  }
};

export const debugTimeEnd = (arg: string) => {
  if (isDebugEnabled) {
    console.timeEnd(arg);
  }
};
