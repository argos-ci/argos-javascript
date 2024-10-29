import { getGlobalScript } from "@argos-ci/browser";
import { createHash } from "node:crypto";

/**
 * Get the CSP script hash.
 */
export function getCSPScriptHash() {
  const hash = createHash("sha256").update(getGlobalScript()).digest("base64");
  return `'sha256-${hash}'`;
}
