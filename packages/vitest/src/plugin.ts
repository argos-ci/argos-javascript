import type { Plugin } from "vitest/config";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
 * Whether Storybook is installed for a Vitest project: resolvable from its
 * root, or from one of its setup files (where `setProjectAnnotations()` usually
 * is, possibly in a package of its own).
 */
function checkHasStorybook(config: {
  root: string;
  setupFiles: string[];
}): boolean {
  return [join(config.root, "package.json"), ...config.setupFiles].some(
    (from) => {
      try {
        createRequire(from).resolve("storybook/package.json");
        return true;
      } catch {
        return false;
      }
    },
  );
}

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
  const storybookSetupFile = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "./storybook-setup-file.mjs",
  );
  return {
    name: "@argos-ci/vitest",
    configureVitest({ vitest, project }) {
      // Ahead of the user's setup files, which may set Storybook's project
      // annotations: it records the story each test renders, so screenshots of
      // stories are reported as Storybook ones. Only where Storybook is
      // installed, it would load in every test file for nothing otherwise.
      if (checkHasStorybook(project.config)) {
        project.config.setupFiles.unshift(storybookSetupFile);
      }

      if (uploadToArgos) {
        vitest.config.reporters.push(
          new ArgosReporter({ ...otherOptions, root }),
        );
      }
    },
    config() {
      return {
        optimizeDeps: {
          include: [
            "@argos-ci/vitest",
            "@argos-ci/vitest/storybook",
            "@argos-ci/vitest/internal/storybook-setup-file",
          ],
        },
        test: {
          // Record each test's source location so Argos can attach it to the
          // screenshot/snapshot metadata (and link back to the test source).
          includeTaskLocation: true,
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
