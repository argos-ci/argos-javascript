import createDebug from "debug";

const KEY = "@argos-ci/core";

export const debug = createDebug(KEY);

/**
 * Leading characters of a token kept in the debug output: enough to tell two
 * tokens apart, far too few to use.
 */
const TOKEN_PREVIEW_LENGTH = 6;

/**
 * Show which token is in play without publishing it.
 *
 * Debug output is the documented way to report an upload problem: it gets
 * pasted into public issues and written to CI logs, which are world-readable on
 * public repositories, so a token printed in full is a published token
 * (GHSA-28pg-v3hp-9g7f). The first few characters answer "is that the token I
 * think it is?" and are useless to anyone else.
 */
export function maskToken(
  token: string | null | undefined,
): string | null | undefined {
  if (!token) {
    return token;
  }
  return `${token.slice(0, TOKEN_PREVIEW_LENGTH)}…`;
}

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
