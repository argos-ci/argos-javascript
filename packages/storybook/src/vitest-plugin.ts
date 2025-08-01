import type { Plugin } from "vitest/config";
import type { BrowserCommand, BrowserCommandContext } from "vitest/node";
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
import { ArgosReporter, type ArgosReporterConfig } from "./vitest-reporter";
import { resolve } from "node:path";

export type { ArgosScreenshotOptions };

export type ArgosScreenshotCommandArgs = [
  Pick<StorybookScreenshotContext<Frame>, "name" | "story" | "test">,
];

export interface ArgosVitestPluginOptions
  extends Pick<StorybookScreenshotContext<Frame>, "applyGlobals">,
    ArgosReporterConfig,
    ArgosScreenshotOptions {
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
  const { applyGlobals, ...screenshotOptions } = pluginOptions ?? {};
  return async (ctx, testContext) => {
    const frame = await ctx.frame();
    // Get the fitToContent option from the story parameters.
    const fitToContent = getFitToContentFromParameters(
      testContext.story.parameters,
    );
    const after = await before(ctx);
    const attachments = await storybookArgosScreenshot(
      frame,
      {
        ...testContext,
        playwrightLibraries: ["@storybook/addon-vitest"],
        setViewportSize: async (size) => {
          await ctx.page.evaluate((size) => {
            const iframe = document.querySelector('iframe[data-vitest="true"]');

            if (!(iframe instanceof HTMLIFrameElement)) {
              throw new Error("Vitest iframe not found");
            }

            if (size === "default") {
              // Restore the default width and height if they were set.
              if (iframe.dataset.defaultWidth && iframe.dataset.defaultHeight) {
                iframe.style.width = iframe.dataset.defaultWidth;
                iframe.style.height = iframe.dataset.defaultHeight;
              }
            } else {
              // Backup default width and height if not already set.
              if (
                !iframe.dataset.defaultWidth &&
                !iframe.dataset.defaultHeight
              ) {
                iframe.dataset.defaultWidth = iframe.style.width;
                iframe.dataset.defaultHeight = iframe.style.height;
              }

              iframe.style.width = `${size.width}px`;
              iframe.style.height = `${size.height}px`;
            }
          }, size);
        },
        applyGlobals,
      },
      applyFitToContent(screenshotOptions, fitToContent),
    );
    await after();
    return attachments;
  };
};

/**
 * Run before taking the screenshots.
 * Remove the scale from vitest "vitest-tester" div
 * to avoid ending up with small screenshots.
 * @returns A function to restore the scale after the test.
 */
async function before(
  ctx: BrowserCommandContext,
): Promise<() => Promise<void>> {
  await ctx.page.evaluate(() => {
    const tester = document.getElementById("vitest-tester");

    if (!(tester instanceof HTMLElement)) {
      return;
    }

    const scale = tester.getAttribute("data-scale");

    if (!scale) {
      throw new Error("Vitest iframe data-scale attribute not found");
    }

    tester.dataset.bckTransform = tester.style.transform;
    tester.style.transform = `scale(1)`;
  });

  return async () => {
    await ctx.page.evaluate(() => {
      const tester = document.getElementById("vitest-tester");

      if (!(tester instanceof HTMLElement)) {
        return;
      }

      tester.style.transform = tester.dataset.bckTransform ?? "";
    });
  };
}

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
    element: "body > div:not(.sb-wrapper)",
    argosCSS:
      `body > div:not(.sb-wrapper) { padding: ${padding}px; width: fit-content; height: fit-content; zoom: ${zoom}; }` +
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
  const setupFile = resolve(import.meta.dirname, "./vitest-setup-file.js");
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
              argosScreenshot: createArgosScreenshotCommand({
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
