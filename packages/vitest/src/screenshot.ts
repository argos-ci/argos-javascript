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
 * - wraps `beforeScreenshot` so the iframe is grown to fit once the content has
 *   settled (see {@link fitIframeToContent}) — otherwise wide/tall content
 *   would be clipped;
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
      // Stabilize before measuring: `beforeScreenshot` runs *before* the SDK
      // waits for images and fonts, and an image that has not loaded yet takes
      // no space. Sizing the iframe from that layout leaves it too short for
      // the final content, and everything below is never painted.
      await api.runStabilization();
      // Re-fit the iframe here, after stabilization has injected `argosCSS` and
      // the content reached its final size, so nothing is clipped.
      await fitIframeToContent(ctx, { fitWidth: config.fitWidth });
    },
  };

  const frame = await ctx.frame();
  return argosPlaywrightScreenshot(frame, name, playwrightOptions);
}
