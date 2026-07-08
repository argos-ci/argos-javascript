import type { Plugin } from "vitest/config";
import type { BrowserCommand } from "vitest/node";
import {
  storybookArgosScreenshot,
  type ArgosScreenshotOptions,
  type StorybookScreenshotContext,
} from "./utils/screenshot";
import {
  getFitToContentFromParameters,
  type FitToContent,
} from "./utils/parameters";
import type { Frame } from "playwright";
import {
  ArgosReporter,
  type ArgosReporterConfig,
} from "@argos-ci/vitest/plugin";
import {
  resetTesterScale,
  setIframeViewportSize,
  fitIframeToContent,
} from "@argos-ci/vitest/internal";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type { ArgosScreenshotOptions };

export type ArgosScreenshotCommandArgs = [
  Pick<StorybookScreenshotContext<Frame>, "name" | "story" | "test" | "mode">,
];

export interface ArgosVitestPluginOptions
  extends ArgosReporterConfig, ArgosScreenshotOptions {
  /**
   * Upload the report to Argos.
   * @default true
   */
  uploadToArgos?: boolean;
}

/**
 * Create a command for taking Argos screenshots in Vitest.
 */
export const createArgosScreenshotCommand = (
  pluginOptions?: ArgosVitestPluginOptions,
): BrowserCommand<ArgosScreenshotCommandArgs> => {
  const screenshotOptions = pluginOptions ?? {};
  return async (ctx, testContext) => {
    const frame = await ctx.frame();
    // Get the fitToContent option from the story parameters.
    const fitToContent = getFitToContentFromParameters(
      testContext.story.parameters,
    );
    const after = await resetTesterScale(ctx);

    const options = applyFitToContent(screenshotOptions, fitToContent);
    // The story renders inside an `<iframe data-vitest="true">` on the host page
    // and we screenshot the iframe's `<body>`. Anything overflowing the iframe box
    // is not painted, so the screenshot gets cut. `setViewportSize` grows the iframe
    // *before* `argosCSS` (which injects `fitToContent`'s `zoom`) is applied, so it
    // can't account for the final content size. Re-fit the iframe here, after
    // stabilization has injected `argosCSS`, so the whole content is painted.
    const userBeforeScreenshot = options?.beforeScreenshot;
    const optionsWithFit: ArgosScreenshotOptions = {
      ...options,
      beforeScreenshot: async (api) => {
        await userBeforeScreenshot?.(api);
        // `fitToContent` fits the content in both dimensions, so the iframe must
        // also grow horizontally to paint content wider than the viewport.
        // Without `fitToContent` we keep the viewport width to match Playwright's
        // `fullPage` semantics (full height, viewport width).
        await fitIframeToContent(ctx, { fitWidth: Boolean(fitToContent) });
      },
    };

    const attachments = await storybookArgosScreenshot(
      frame,
      {
        ...testContext,
        playwrightLibraries: ["@storybook/addon-vitest"],
        setViewportSize: async (size) => {
          await setIframeViewportSize(ctx, size, {
            fullPage: screenshotOptions.fullPage ?? !fitToContent,
          });
        },
      },
      optionsWithFit,
    );
    await after();
    return attachments;
  };
};

/**
 * Apply fitToContent options to the screenshot options.
 */
function applyFitToContent(
  options: ArgosScreenshotOptions | undefined,
  fitToContent: FitToContent | null,
): ArgosScreenshotOptions | undefined {
  if (!fitToContent) {
    return options;
  }

  const { padding, zoom } = fitToContent;
  return {
    ...options,
    element: "body",
    argosCSS:
      `body { padding: ${padding}px; width: fit-content; height: fit-content; min-height: initial; zoom: ${zoom}; }` +
      (options?.argosCSS ?? ""),
  };
}

const cwd = process.cwd();

export function argosVitestPlugin(options?: ArgosVitestPluginOptions): Plugin {
  const {
    root: unresolvedRoot = "./screenshots",
    uploadToArgos,
    ...otherOptions
  } = options ?? {};
  const root = resolve(cwd, unresolvedRoot);
  const setupFile = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "./vitest-setup-file.mjs",
  );
  return {
    name: "@argos-ci/storybook/vitest-plugin",
    configureVitest({ vitest, project }) {
      project.config.setupFiles.push(setupFile);

      if (uploadToArgos) {
        vitest.config.reporters.push(
          new ArgosReporter({ ...otherOptions, root }),
        );
      }
    },
    config() {
      return {
        optimizeDeps: {
          include: ["@argos-ci/storybook/internal/vitest-setup-file"],
        },
        test: {
          browser: {
            commands: {
              argosStorybookScreenshot: createArgosScreenshotCommand({
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
