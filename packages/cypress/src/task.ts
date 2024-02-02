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

export function registerArgosTask(
  on: Cypress.PluginEvents,
  config: Cypress.Config,
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
  on("after:run", async () => {
    const { screenshotsFolder } = config;
    if (!screenshotsFolder) return;
    const { uploadToArgos = true } = options || {};
    if (!uploadToArgos) return;
    const res = await upload({
      files: ["**/*.png"],
      root: screenshotsFolder,
      ...options,
    });
    console.log(`✅ Argos build created: ${res.build.url}`);
  });
}
