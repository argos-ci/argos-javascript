import { extname, resolve } from "node:path";
import glob from "fast-glob";
import { debug } from "./debug";

/**
 * Discover snapshots in the given root directory matching the provided patterns.
 */
export async function discoverSnapshots(
  patterns: string | string[],
  { root = process.cwd(), ignore }: { root?: string; ignore?: string[] } = {},
): Promise<{ name: string; path: string }[]> {
  debug(
    `Discovering snapshots with patterns: ${
      Array.isArray(patterns) ? patterns.join(", ") : patterns
    } in ${root}`,
  );
  const matches = await glob(patterns, { onlyFiles: true, ignore, cwd: root });
  return matches.map((match) => {
    debug(`Found screenshot: ${match}`);
    const path = resolve(root, match);
    return {
      name: match,
      path,
    };
  });
}

/**
 * Check if the given filename corresponds to an Argos image.
 */
export function checkIsValidImageFile(filename: string): boolean {
  const lowerFilename = extname(filename).toLowerCase();
  return (
    lowerFilename === ".png" ||
    lowerFilename === ".jpg" ||
    lowerFilename === ".jpeg"
  );
}
