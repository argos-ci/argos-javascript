import { readVersionFromPackage } from "@argos-ci/util";
import { createRequire } from "node:module";
import {
  STORYBOOK_AUTOMATION_LIBRARIES,
  type StorybookContext,
} from "./storybook";

const require = createRequire(import.meta.url);

/**
 * Resolve the first installed of the given packages, with its version, or
 * `null` when none is. Looked up from `from`, a file of the user's project,
 * then from this package: its own install location cannot reach packages it
 * does not depend on with strict package managers (Yarn PnP, pnpm without
 * hoisting).
 */
export async function resolveInstalledPackage(
  names: readonly string[],
  from: string | undefined,
): Promise<{ name: string; version: string } | null> {
  const requires = from ? [createRequire(from), require] : [require];
  for (const { resolve } of requires) {
    for (const name of names) {
      let pkgPath: string;
      try {
        pkgPath = resolve(`${name}/package.json`);
      } catch {
        continue;
      }
      return { name, version: await readVersionFromPackage(pkgPath) };
    }
  }
  return null;
}

/**
 * Resolve the automation library a capture of a story reports: the Storybook
 * package running it, looked up from the test file.
 */
export function resolveStorybookLibrary(
  storybook: StorybookContext,
  testFile: string | undefined,
) {
  return resolveInstalledPackage(
    STORYBOOK_AUTOMATION_LIBRARIES[storybook.source],
    testFile,
  );
}

/**
 * Get the version of the Argos Vitest SDK.
 */
export async function getArgosVitestVersion(): Promise<string> {
  const pkgPath = require.resolve("@argos-ci/vitest/package.json");
  return readVersionFromPackage(pkgPath);
}

/**
 * Get the version of Vitest itself (used as the automation library for
 * `argosSnapshot`, which does not rely on a browser).
 */
export async function getVitestVersion(): Promise<string> {
  const pkgPath = require.resolve("vitest/package.json");
  return readVersionFromPackage(pkgPath);
}
