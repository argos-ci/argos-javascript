import type { Plugin } from "vitest/config";
import { resolve } from "node:path";
import { createArgosScreenshotCommand } from "./command";
import { createArgosSnapshotCommand } from "./snapshot-command";
import { ArgosReporter } from "./reporter";
import type { ArgosVitestPluginOptions } from "./options";

export {
  createArgosScreenshotCommand,
  createArgosSnapshotCommand,
  ArgosReporter,
};
export type { ArgosScreenshotCommandArgs } from "./command";
export type { ArgosSnapshotCommandArgs } from "./snapshot-command";
export type {
  ArgosVitestPluginOptions,
  VitestScreenshotOptions,
  VitestSnapshotOptions,
  ArgosReporterConfig,
} from "./options";

const cwd = process.cwd();

/**
 * Vitest plugin that registers the `argosScreenshot` browser command and,
 * optionally, the reporter that uploads the captured screenshots to Argos.
 *
 * @example
 * ```ts
 * import { defineConfig } from "vitest/config";
 * import { playwright } from "@vitest/browser-playwright";
 * import { argosVitestPlugin } from "@argos-ci/vitest/plugin";
 *
 * export default defineConfig({
 *   plugins: [argosVitestPlugin({ uploadToArgos: true })],
 *   test: {
 *     browser: {
 *       enabled: true,
 *       provider: playwright(),
 *       instances: [{ browser: "chromium" }],
 *     },
 *   },
 * });
 * ```
 */
export function argosVitestPlugin(options?: ArgosVitestPluginOptions): Plugin {
  const {
    root: unresolvedRoot = "./snapshots",
    uploadToArgos,
    ...otherOptions
  } = options ?? {};
  const root = resolve(cwd, unresolvedRoot);
  return {
    name: "@argos-ci/vitest",
    configureVitest({ vitest }) {
      if (uploadToArgos) {
        vitest.config.reporters.push(
          new ArgosReporter({ ...otherOptions, root }),
        );
      }
    },
    config() {
      return {
        optimizeDeps: {
          include: ["@argos-ci/vitest"],
        },
        test: {
          browser: {
            commands: {
              argosScreenshot: createArgosScreenshotCommand({
                ...otherOptions,
                root,
              }),
              argosSnapshot: createArgosSnapshotCommand({
                ...otherOptions,
                root,
              }),
            },
          },
        },
      };
    },
  };
}
