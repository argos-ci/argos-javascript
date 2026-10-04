import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";

import { defineConfig } from "vitest/config";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { argosVitestPlugin as argosVitestSdkPlugin } from "@argos-ci/vitest/plugin";
import { argosVitestPlugin } from "./dist/vitest-plugin.mjs";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

/**
 * Browser mode settings, a fresh object for each project: Vitest mutates the
 * browser instances it is given.
 */
function getBrowserConfig() {
  return {
    enabled: true,
    headless: true,
    provider: playwright(),
    instances: [{ browser: "chromium" as const }],
    // Storybook's Vitest addon carries its own default of 1200x900 and
    // applies it through an API that no longer takes effect on Vitest
    // 5, which would silently drop these stories to Vitest's own
    // 414x896 default and reshoot every baseline. Pinning it keeps the
    // two majors producing identical screenshots.
    viewport: { width: 1200, height: 900 },
  };
}

/**
 * Where the `@argos-ci/vitest` projects write their screenshots: the directory
 * the Storybook plugin uploads, so they land in the same Argos build.
 */
const VITEST_SDK_ROOT = "./screenshots";

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
          browser: getBrowserConfig(),
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
      {
        // `@argos-ci/vitest` on stories rendered by regular tests (portable
        // stories): it must report them as Storybook screenshots.
        extends: true,
        plugins: [argosVitestSdkPlugin({ root: VITEST_SDK_ROOT })],
        test: {
          name: "vitest-sdk-portable-stories",
          include: ["vitest-sdk/**/*.test.ts"],
          browser: getBrowserConfig(),
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
      {
        // `@argos-ci/vitest` on the tests `@storybook/addon-vitest` generates
        // from stories.
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, "vitest-sdk/.storybook"),
          }),
          argosVitestSdkPlugin({ root: VITEST_SDK_ROOT }),
        ],
        test: {
          name: "vitest-sdk-addon-vitest",
          browser: getBrowserConfig(),
          // Absolute: the addon roots the project at its Storybook config.
          setupFiles: [path.join(dirname, "vitest-sdk/addon-vitest.setup.ts")],
        },
      },
    ],
  },
});
