import tmp from "tmp";
import rimraf from "rimraf";
import spawn from "cross-spawn";
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

  const child = spawn(
    "node_modules/.bin/argos",
    [
      "upload",
      "--branch",
      options.branch,
      "--commit",
      options.commit,
      "--token",
      options.token,
      options.dir,
    ],
    {
      shell: true,
    }
  );

  let error = "";
  child.stderr.on("data", (data) => {
    error += String(data);
  });

  await Promise.race([
    new Promise((resolve, reject) => {
      child.on("error", reject);
    }),
    new Promise((resolve, reject) => {
      child.on("exit", (code) => (code ? reject(new Error(error)) : resolve()));
    }),
  ]);

  activity.end();
}

export async function onPostBuild(gatsbyParams, options = {}) {
  if (!options.dir) {
    await takeScreenshots(runArgosCLI, gatsbyParams, options);
  } else {
    await runArgosCLI(gatsbyParams, options);
  }
}
