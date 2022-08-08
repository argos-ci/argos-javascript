import fs from "mz/fs";
import fetch from "node-fetch";
import FormData from "form-data";
import isDirectory from "./isDirectory";
import isReadable from "./isReadable";
import readScreenshots, { GLOB_PATTERN } from "./readScreenshots";
import getEnvironment from "./getEnvironment";
import config from "./config";
import { displayInfo } from "./display";
import pkg from "../package.json";

export class UploadError extends Error {}

async function upload(options) {
  const {
    directory,
    ignore = [],
    token: tokenOption,
    branch: branchOption,
    commit: commitOption,
    externalBuildId: externalBuildIdOption,
    buildName: buildNameOption,
    batchCount: batchCountOption,
  } = options;

  const token = tokenOption || config.get("token");
  let environment = {};

  if (process.env.ARGOS_CLI_TEST !== "true") {
    environment = getEnvironment();
  }
  const branch = branchOption || config.get("branch") || environment.branch;
  const commit = commitOption || config.get("commit") || environment.commit;
  const externalBuildId =
    externalBuildIdOption ||
    config.get("externalBuildId") ||
    environment.externalBuildId;
  const batchCount =
    batchCountOption || config.get("batchCount") || environment.batchCount;
  const name = buildNameOption || config.get("buildName");

  if (environment.ci) {
    displayInfo(`identified \`${environment.ci}\` environment`);
  }

  if (!token) {
    throw new UploadError(
      "Token missing: use ARGOS_TOKEN or the --token option."
    );
  }

  if (!branch) {
    throw new UploadError(
      "Branch missing: use ARGOS_BRANCH or the --branch option."
    );
  }

  if (!commit) {
    throw new UploadError(
      "Commit missing: use ARGOS_COMMIT or the --commit option."
    );
  }

  if (!(await isDirectory(directory))) {
    throw new UploadError("The path provided is not a directory.");
  }

  if (!(await isReadable(directory))) {
    throw new UploadError(
      "The path provided is not a readable, please check fs rights."
    );
  }

  displayInfo(`using \`${branch}\` as branch`);
  displayInfo(`using \`${commit}\` as commit`);

  const screenshots = await readScreenshots({ cwd: directory, ignore });

  if (screenshots.length === 0 && !externalBuildId) {
    throw new UploadError(
      `The path provided doesn't contain any image (${GLOB_PATTERN}).`
    );
  }

  displayInfo(`found ${screenshots.length} screenshots to upload`);

  const body = new FormData();
  body.append(
    "data",
    JSON.stringify({
      name,
      branch,
      commit,
      token,
      externalBuildId,
      batchCount,
      names: screenshots.map((screenshot) => screenshot.name),
    })
  );

  screenshots.reduce((body, screenshot) => {
    body.append("screenshots[]", fs.createReadStream(screenshot.filename));
    return body;
  }, body);

  return fetch(`${config.get("endpoint")}/builds`, {
    headers: {
      "X-Argos-CLI-Version": pkg.version,
    },
    method: "POST",
    body,
  });
}

export default upload;
