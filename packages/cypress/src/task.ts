/// <reference types="cypress" />
import { upload } from "@argos-ci/core";
import type { UploadParameters } from "@argos-ci/core";
import { extname, join, dirname } from "node:path";
import { NAME_PREFIX } from "./shared";
import { copyFile } from "node:fs/promises";

export type RegisterArgosTaskOptions = Omit<
  UploadParameters,
  "files" | "root" | "metadata"
> & {
  /**
   * Upload the report to Argos.
   * @default true
   */
  uploadToArgos?: boolean;
  /**
   * Do not fail the Cypress run when the upload to Argos fails. The error is
   * still logged.
   * @default false
   */
  ignoreUploadFailures?: boolean;
};

function checkIsCypressFailedResult(
  results:
    | CypressCommandLine.CypressFailedRunResult
    | CypressCommandLine.CypressRunResult,
): results is CypressCommandLine.CypressFailedRunResult {
  return "status" in results && results.status === "failed";
}

let screenshotsDirectoryPromise: Promise<string> | undefined = undefined;

/**
 * Get the path to the directory where screenshots will be stored.
 */
async function getScreenshotsDirectory(): Promise<string> {
  const { createTemporaryDirectory } = await import("@argos-ci/util");

  if (!screenshotsDirectoryPromise) {
    screenshotsDirectoryPromise = createTemporaryDirectory();
  }
  return screenshotsDirectoryPromise;
}

/**
 * Create a directory if it does not exist.
 */
async function createDirectory(directory: string): Promise<void> {
  const { createDirectory } = await import("@argos-ci/util");
  await createDirectory(directory);
}

function getArgosConfigFromOptions(
  options: RegisterArgosTaskOptions | undefined,
) {
  const {
    uploadToArgos = true,
    ignoreUploadFailures = false,
    ...uploadParameters
  } = options ?? {};
  return { uploadToArgos, ignoreUploadFailures, uploadParameters };
}

/**
 * Cypress "after:screenshot" event handler.
 * - Move screenshots to Argos directory
 */
export async function argosAfterScreenshot(
  config: Cypress.PluginConfigOptions,
  details: Cypress.ScreenshotDetails,
  options?: RegisterArgosTaskOptions,
) {
  const { uploadToArgos } = getArgosConfigFromOptions(options);

  if (!uploadToArgos) {
    return { path: details.path };
  }

  const argosScreenshotsDir = await getScreenshotsDirectory();

  // Cypress types are wrong... The name can be "undefined"
  if (details.name?.startsWith(NAME_PREFIX)) {
    const newPath = join(
      argosScreenshotsDir,
      details.name.slice(NAME_PREFIX.length) + extname(details.path),
    );

    await createDirectory(dirname(newPath));
    await copyFile(details.path, newPath);

    return { path: newPath };
  }

  const { screenshotsFolder } = config;

  if (!screenshotsFolder) {
    throw new Error(
      "Cypress screenshotsFolder is not defined. Please set it in your cypress.config.js",
    );
  }

  if (!details.path.startsWith(screenshotsFolder)) {
    throw new Error(
      `Cypress screenshot path ${details.path} does not start with the configured screenshotsFolder ${screenshotsFolder}. Please check your cypress.config.js.`,
    );
  }

  const relativePath = details.path.slice(
    screenshotsFolder.length + (screenshotsFolder.endsWith("/") ? 0 : 1),
  );
  const newPath = join(argosScreenshotsDir, relativePath);

  await createDirectory(dirname(newPath));
  await copyFile(details.path, newPath);

  return { path: join(argosScreenshotsDir, relativePath) };
}

/**
 * Cypress "after:run" event handler.
 * - Upload screenshots to Argos
 */
export async function argosAfterRun(
  _config: Cypress.PluginConfigOptions,
  results:
    | CypressCommandLine.CypressRunResult
    | CypressCommandLine.CypressFailedRunResult,
  options?: RegisterArgosTaskOptions,
) {
  const { uploadToArgos, ignoreUploadFailures, uploadParameters } =
    getArgosConfigFromOptions(options);

  if (!uploadToArgos) {
    return;
  }

  const argosScreenshotsDir = await getScreenshotsDirectory();

  try {
    const res = await upload({
      ...uploadParameters,
      files: ["**/*.png"],
      root: argosScreenshotsDir,
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
  } catch (error) {
    // Rethrown, the error fails the Cypress run.
    if (!ignoreUploadFailures) {
      throw error;
    }
    console.error(`❌ Error while creating the Argos build`);
    console.error(error);
    console.warn(
      "⚠️  Upload failure ignored due to the `ignoreUploadFailures` option",
    );
  }
}

/**
 * Register the Argos tasks for Cypress.
 */
export function registerArgosTask(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options?: RegisterArgosTaskOptions,
) {
  on("after:screenshot", (details) => {
    return argosAfterScreenshot(config, details, options);
  });
  on("after:run", async (results) => {
    return argosAfterRun(config, results, options);
  });
}
