import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";

import { defineConfig } from "vitest/config";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { argosVitestPlugin } from "./dist/vitest-plugin.mjs";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
          // This plugin allows you to take screenshots of your stories and upload them to Argos CI.
          argosVitestPlugin({
            uploadToArgos: process.env.UPLOAD_TO_ARGOS === "true",
            buildName: process.env.BUILD_NAME,
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            // Storybook's Vitest addon carries its own default of 1200x900 and
            // applies it through an API that no longer takes effect on Vitest
            // 5, which would silently drop these stories to Vitest's own
            // 414x896 default and reshoot every baseline. Pinning it keeps the
            // two majors producing identical screenshots.
            viewport: { width: 1200, height: 900 },
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
