import tmp from "tmp";
import rimraf from "rimraf";
import { upload } from "@argos-ci/core";
import { onPostBuild as onPostBuildScreenshot } from "gatsby-plugin-screenshot/gatsby-node";

async function takeScreenshots(fn, gatsbyParams, options) {
  // Failed to use unsafeCleanup
  const tmpDir = tmp.dirSync();
  try {
    await onPostBuildScreenshot(gatsbyParams, { ...options, dir: tmpDir.name });
    await fn(gatsbyParams, { ...options, dir: tmpDir.name });
  } finally {
    rimraf.sync(tmpDir.name);
  }
}

async function runArgosCLI({ reporter }, options) {
  const activity = reporter.activityTimer("upload to Argos");
  activity.start();

  await upload({
    branch: options.branch,
    commit: options.commit,
    token: options.token,
    root: options.dir,
  });

  activity.end();
}

export async function onPostBuild(gatsbyParams, options = {}) {
  if (!options.dir) {
    await takeScreenshots(runArgosCLI, gatsbyParams, options);
  } else {
    await runArgosCLI(gatsbyParams, options);
  }
}
