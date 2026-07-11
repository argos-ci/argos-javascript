import type { BrowserCommand } from "vitest/node";
import {
  DO_NOT_USE_setMetadataConfig,
  type ArgosAttachment,
} from "@argos-ci/playwright";
import { resolveViewport, type ViewportSize } from "@argos-ci/browser";
import { getScreenshotName } from "@argos-ci/util";
import type {
  ArgosVitestPluginOptions,
  VitestScreenshotOptions,
} from "./options";
import { resetTesterScale, setIframeViewportSize } from "./iframe";
import type { TestMetadata } from "./metadata";
import { screenshotFrame } from "./screenshot";
import { getArgosVitestVersion } from "./version";

/**
 * Arguments of the `argosScreenshot` browser command.
 * Only serializable values cross the browser/node RPC boundary.
 */
export type ArgosScreenshotCommandArgs = [
  name: string,
  options?: VitestScreenshotOptions,
  test?: TestMetadata,
];

/**
 * Create the `argosScreenshot` browser command used to capture Argos
 * screenshots from Vitest browser tests.
 *
 * Non-serializable options (`beforeScreenshot`, `afterScreenshot`, a
 * `Locator`/`ElementHandle` `element`, …) come from `pluginOptions` (node side)
 * and are merged with the serializable per-call options (per-call wins).
 */
export const createArgosScreenshotCommand = (
  pluginOptions: ArgosVitestPluginOptions = {},
): BrowserCommand<ArgosScreenshotCommandArgs> => {
  return async (ctx, name, options, test) => {
    if (!name) {
      throw new Error("The `name` argument is required.");
    }

    const merged: ArgosVitestPluginOptions = { ...pluginOptions, ...options };
    const fullPage = merged.fullPage ?? false;
    const fitWidth = !fullPage;

    const restore = await resetTesterScale(ctx);
    try {
      const version = await getArgosVitestVersion();
      const setMetadata = (viewport?: ViewportSize) => {
        DO_NOT_USE_setMetadataConfig({
          sdk: { name: "@argos-ci/vitest", version },
          // Report Vitest as the automation library (not the underlying
          // `@vitest/browser-playwright` provider), so screenshots match the
          // `vitest` automation library used by `argosSnapshot`.
          playwrightLibraries: ["vitest"],
          viewport,
          // Injected so the Playwright SDK attaches the Vitest test metadata
          // (Playwright's own `testInfo` is absent here). It resolves
          // `location.file` relative to the git repository.
          test,
        });
      };

      const attachments: ArgosAttachment[] = [];

      if (merged.viewports && merged.viewports.length > 0) {
        // Playwright's `viewports` option throws on a Frame, so we reimplement
        // it by resizing the Vitest iframe for each viewport.
        for (const viewport of merged.viewports) {
          const size = resolveViewport(viewport);
          await setIframeViewportSize(ctx, size, { fullPage });
          setMetadata(size);
          const shot = await screenshotFrame(
            ctx,
            getScreenshotName(name, { viewportWidth: size.width }),
            merged,
            // Keep the fixed viewport width, only grow the height to fit.
            { fitWidth: false },
          );
          attachments.push(...shot);
          await setIframeViewportSize(ctx, "initial", { fullPage });
        }
      } else {
        await setIframeViewportSize(ctx, "default", { fullPage });
        setMetadata();
        const shot = await screenshotFrame(ctx, name, merged, { fitWidth });
        attachments.push(...shot);
      }

      return attachments;
    } finally {
      await restore();
    }
  };
};
