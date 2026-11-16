/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { argosVitestPlugin } from "@argos-ci/storybook/vitest-plugin";

// https://vite.dev/config/
// More info at: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(import.meta.dirname, ".storybook"),
          }),

          // The plugin will capture screenshots of your stories and upload them to Argos.
          // See options at: https://argos-ci.com/docs/reference/storybook
          argosVitestPlugin({
            // Upload to Argos on CI only.
            // Set the ARGOS_TOKEN environment variable if you are not using GitHub Actions.
            uploadToArgos: !!process.env.CI,
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              // Reduce text rendering differences between machines.
              launchOptions: {
                args: ["--disable-lcd-text", "--font-render-hinting=none"],
              },
            }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
