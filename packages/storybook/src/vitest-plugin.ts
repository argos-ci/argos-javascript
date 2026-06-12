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
    const after = await before(ctx);

    const attachments = await storybookArgosScreenshot(
      frame,
      {
        ...testContext,
        playwrightLibraries: ["@storybook/addon-vitest"],
        setViewportSize: async (size) => {
          // Resolve the iframe element that contains the frame being
          // screenshotted. Vitest keeps one iframe per test file, so
          // querying the page for the first matching iframe can return
          // another file's iframe — the story's own iframe then keeps its
          // initial height and the screenshot comes out blank below it.
          const sessionIframe = await frame.frameElement();
          await sessionIframe.evaluate(
            async (iframe, { size, fullPage }) => {
              if (!(iframe instanceof HTMLIFrameElement)) {
                throw new Error("Vitest iframe not found");
              }

              if (!iframe.contentDocument) {
                throw new Error("Vitest iframe contentDocument not found");
              }

              if (size === "initial") {
                if (
                  iframe.dataset.initialWidth &&
                  iframe.dataset.initialHeight
                ) {
                  iframe.style.width = iframe.dataset.initialWidth;
                  iframe.style.height = iframe.dataset.initialHeight;
                }
                return;
              }

              // Backup default width/height if not set
              if (
                !iframe.dataset.initialWidth &&
                !iframe.dataset.initialHeight
              ) {
                iframe.dataset.initialWidth = iframe.style.width;
                iframe.dataset.initialHeight = iframe.style.height;
              }

              if (size !== "default") {
                iframe.style.width = `${size.width}px`;
              }

              // Each story starts a fresh viewport-tracking check.
              delete iframe.dataset.argosTrackedGap;

              const settleFrames = async () => {
                // Force a layout and wait for two frames so the browser
                // draws the area exposed by a resize before the screenshot.
                iframe.getBoundingClientRect();
                await new Promise<void>((resolve) =>
                  requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve()),
                  ),
                );
              };

              if (fullPage) {
                if (!iframe.contentWindow) {
                  throw new Error(`Can't access iframe window`);
                }
                const viewportHeight =
                  size === "default"
                    ? iframe.contentWindow.innerHeight
                    : size.height;

                iframe.style.height = "auto";
                const measuredBody = iframe.contentDocument.body.offsetHeight;
                const gap = measuredBody - viewportHeight;
                iframe.style.height = gap > 0 ? `${measuredBody}px` : "100%";
                await settleFrames();
                if (gap > 0) {
                  // A body whose height tracks the iframe (e.g. a
                  // 100%-height layout plus padding) is always taller by the
                  // same gap — stretching can never catch up and only
                  // inflates the snapshot. If the gap survived the stretch,
                  // revert it.
                  const newGap =
                    iframe.contentDocument.body.offsetHeight -
                    iframe.clientHeight;
                  if (newGap > 0 && Math.abs(newGap - gap) <= 1) {
                    iframe.style.height = "100%";
                    iframe.dataset.argosTrackedGap = String(gap);
                    await settleFrames();
                  }
                }
              } else if (size !== "default") {
                iframe.style.height = "auto";
                iframe.style.height = `${size.height}px`;
                await settleFrames();
              }
            },
            { size, fullPage: screenshotOptions.fullPage ?? !fitToContent },
          );
        },
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
