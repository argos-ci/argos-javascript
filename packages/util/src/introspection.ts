import { readFile } from "node:fs/promises";

// Cache the version to avoid reading the file multiple times.
const versionCache = new Map<string, Promise<string>>();

/**
 * Read the version from a package.json file.
 */
export function readVersionFromPackage(pkgPath: string): Promise<string> {
  const readVersion = async () => {
    const { version } = JSON.parse(await readFile(pkgPath, "utf-8"));
    if (typeof version !== "string") {
      throw new Error("Invalid version");
    }
    return version as string;
  };
  if (!versionCache.has(pkgPath)) {
    versionCache.set(pkgPath, readVersion());
  }
  const fromCache = versionCache.get(pkgPath);
  if (!fromCache) {
    throw new Error("Invariant violation: version not in cache");
  }
  return fromCache;
}
