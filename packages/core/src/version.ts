import { readVersionFromPackage } from "@argos-ci/util";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Get the version of the @argos-ci/core package.
 */
export async function getArgosCoreSDKIdentifier(): Promise<string> {
  const pkgPath = require.resolve("@argos-ci/core/package.json");
  const version = await readVersionFromPackage(pkgPath);
  return `@argos-ci/core@${version}`;
}
