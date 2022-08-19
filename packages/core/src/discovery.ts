import { resolve } from "node:path";
import glob from "fast-glob";

export const discoverScreenshots = async (
  patterns: string[],
  { root = process.cwd(), ignore }: { root?: string; ignore?: string[] } = {}
) => {
  const matches = await glob(patterns, { onlyFiles: true, ignore, cwd: root });
  return matches.map((match) => ({
    name: match,
    path: resolve(root, match),
  }));
};
