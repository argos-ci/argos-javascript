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

export function registerArgosTask(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options?: RegisterArgosTaskOptions,
) {
  on("after:screenshot", async (details) => {
    const { uploadToArgos = true } = options || {};

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
  });
  on("after:run", async (results) => {
    const { uploadToArgos = true } = options || {};

    if (!uploadToArgos) {
      return;
    }

    const argosScreenshotsDir = await getScreenshotsDirectory();

    const res = await upload({
      ...options,
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
  });
}
