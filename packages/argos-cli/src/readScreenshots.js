import path from "path";
import glob from "glob-promise";

export const GLOB_PATTERN = "**/*.{png,jpg}";

async function readScreenshots({ cwd, ignore = [] }) {
  const matches = await glob(GLOB_PATTERN, {
    cwd,
    ignore,
    nodir: true,
  });

  return matches.map((match) => ({
    name: match,
    filename: path.resolve(cwd, match),
  }));
}

export default readScreenshots;
