import { readVersionFromPackage } from "@argos-ci/util";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Get the version of the Argos Vitest SDK.
 */
export async function getArgosVitestVersion(): Promise<string> {
  const pkgPath = require.resolve("@argos-ci/vitest/package.json");
  return readVersionFromPackage(pkgPath);
}
