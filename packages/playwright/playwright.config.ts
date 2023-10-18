import { defineConfig, devices } from "@playwright/test";
import type { ArgosReporterOptions } from "@argos-ci/playwright/reporter";

export default defineConfig({
  use: {
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter:
    process.env.WITH_ARGOS_REPORTER === "true"
      ? [
          ["list"],
          [
            "@argos-ci/playwright/reporter",
            {
              buildName: `argos-playwright-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}`,
            } as ArgosReporterOptions,
          ],
        ]
      : [["list"]],
});
