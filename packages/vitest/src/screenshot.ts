import {
  argosScreenshot as argosPlaywrightScreenshot,
  type ArgosAttachment,
  type ArgosScreenshotOptions as PlaywrightScreenshotOptions,
} from "@argos-ci/playwright";
import type { BrowserCommandContext } from "vitest/node";
import { fitIframeToContent } from "./iframe";

/**
 * Take a screenshot of the Vitest iframe body using the Playwright SDK.
 *
 * This is the shared primitive both the standalone command and Storybook build
 * on. It:
 * - strips the Vitest-specific `viewports`/`fullPage` options (they drive the
 *   iframe resize, not Playwright);
 * - wraps `beforeScreenshot` so the content is grown to fit *after* `argosCSS`
 *   (and any user `beforeScreenshot`) has been applied — otherwise wide/tall
 *   content would be clipped;
 * - captures the iframe's `<body>` via `@argos-ci/playwright`.
 *
 * @param config.fitWidth - Grow the iframe horizontally as well as vertically
 *   to fit the content (used when not capturing a fixed viewport width).
 */
export async function screenshotFrame(
  ctx: BrowserCommandContext,
  name: string,
  options: PlaywrightScreenshotOptions,
  config: { fitWidth: boolean },
): Promise<ArgosAttachment[]> {
  const { viewports: _viewports, fullPage: _fullPage, ...rest } = options;
  const userBeforeScreenshot = rest.beforeScreenshot;

  const playwrightOptions: PlaywrightScreenshotOptions = {
    ...rest,
    beforeScreenshot: async (api) => {
      await userBeforeScreenshot?.(api);
      // Re-fit the iframe here, after stabilization has injected `argosCSS`, so
      // the whole content is painted and nothing is clipped.
      await fitIframeToContent(ctx, { fitWidth: config.fitWidth });
    },
  };

  const frame = await ctx.frame();
  return argosPlaywrightScreenshot(frame, name, playwrightOptions);
}
