/// <reference types="cypress" />
import { UploadParameters, upload } from "@argos-ci/core";

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
