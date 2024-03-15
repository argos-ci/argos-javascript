import { resolve } from "node:path";
import glob from "fast-glob";
import { debug } from "./debug";

export const discoverScreenshots = async (
  patterns: string | string[],
  { root = process.cwd(), ignore }: { root?: string; ignore?: string[] } = {},
): Promise<{ name: string; path: string }[]> => {
  debug(
    `Discovering screenshots with patterns: ${
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
};
