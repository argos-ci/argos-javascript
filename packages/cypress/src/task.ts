/// <reference types="cypress" />
import { UploadParameters, upload } from "@argos-ci/core";
import { basename, extname, join, dirname } from "node:path";
import { rename } from "node:fs/promises";

export type RegisterArgosTaskOptions = Omit<
  UploadParameters,
  "files" | "root"
> & {
  /**
   * Upload the report to Argos.
   * @default true
   */
  uploadToArgos?: boolean;
};

function checkIsCypressFailedResult(
  results:
    | CypressCommandLine.CypressFailedRunResult
    | CypressCommandLine.CypressRunResult,
): results is CypressCommandLine.CypressFailedRunResult {
  return "status" in results && results.status === "failed";
}

export function registerArgosTask(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options?: RegisterArgosTaskOptions,
) {
  on("after:screenshot", async (details) => {
    // Get the base filename without extension
    const baseName = basename(details.path, extname(details.path));

    // Remove attempt from the filename
    const newBaseName = baseName.replace(/ \(attempt \d+\)/, "");

    // Construct a new path with the original file extension
    const newPath = join(
      dirname(details.path),
      newBaseName + extname(details.path),
    );

    // Rename the file
    await rename(details.path, newPath);

    return { path: newPath };
  });
  on("after:run", async (results) => {
    const { screenshotsFolder } = config;
    if (!screenshotsFolder) {
      return;
    }
    const { uploadToArgos = true } = options || {};
    if (!uploadToArgos) {
      return;
    }

    const res = await upload({
      ...options,
      files: ["**/*.png"],
      root: screenshotsFolder,
      metadata: {
        testReport: checkIsCypressFailedResult(results)
          ? { status: "failed" }
          : {
              status: "passed",
              stats: {
                startTime: results.startedTestsAt,
                duration: results.totalDuration,
              },
            },
      },
    });

    console.log(`✅ Argos build created: ${res.build.url}`);
  });
}
