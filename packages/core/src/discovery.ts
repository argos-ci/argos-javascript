import { resolve } from "node:path";
import glob from "fast-glob";

export const discoverScreenshots = async (
  patterns: string[],
  { cwd = process.cwd(), ignore }: { cwd?: string; ignore?: string[] } = {}
) => {
  const matches = await glob(patterns, { onlyFiles: true, ignore, cwd });
  return matches.map((match) => ({
    name: match,
    path: resolve(cwd, match),
  }));
};
