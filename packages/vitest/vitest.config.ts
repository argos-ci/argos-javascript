import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { argosVitestPlugin } from "./dist/plugin.mjs";

export default defineConfig({
  test: {
    projects: [
      {
        // Node unit tests.
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // Browser end-to-end tests exercising the real screenshot flow.
        plugins: [
          argosVitestPlugin({
            uploadToArgos: process.env.UPLOAD_TO_ARGOS === "true",
            buildName: process.env.BUILD_NAME,
          }),
        ],
        test: {
          name: "e2e",
          include: ["e2e/**/*.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
