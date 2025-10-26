import { defineConfig, devices } from "@playwright/test";
import { createArgosReporterOptions } from "@argos-ci/playwright/reporter";

export default defineConfig({
  testMatch: ["**/*.spec.ts"],
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [
    ["list"],
    [
      "@argos-ci/playwright/reporter",
      createArgosReporterOptions({
        buildName: `argos-playwright-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}`,
        uploadToArgos: process.env.UPLOAD_TO_ARGOS === "true",
      }),
    ],
  ],
});
