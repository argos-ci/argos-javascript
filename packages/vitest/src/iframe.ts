import type { BrowserCommandContext } from "vitest/node";
import type { ViewportSize } from "@argos-ci/browser";

/**
 * Selector of the iframe Vitest renders the test into on the orchestrator page.
 */
export const VITEST_IFRAME_SELECTOR = 'iframe[data-vitest="true"]';

/**
 * ID of the Vitest "tester" element that wraps the iframe with a `scale(...)`
 * transform.
 */
export const VITEST_TESTER_ID = "vitest-tester";

/**
 * Attribute holding the iframe's inline size from before Argos resized it, as
 * JSON.
 *
 * The presence of the attribute — not the values it holds — is what marks the
 * size as backed up: the original `style.width`/`style.height` are usually
 * empty strings, which are indistinguishable from "nothing was saved yet".
 */
const SIZE_BACKUP_ATTRIBUTE = "data-argos-size-backup";

/**
 * Remove the scale from the Vitest `#vitest-tester` element before taking a
 * screenshot to avoid ending up with small screenshots.
 * @returns A function to restore the scale after the screenshot.
 */
export async function resetTesterScale(
  ctx: BrowserCommandContext,
): Promise<() => Promise<void>> {
  await ctx.page.evaluate((testerId) => {
    const tester = document.getElementById(testerId);

    if (!(tester instanceof HTMLElement)) {
      return;
    }

    const scale = tester.getAttribute("data-scale");

    if (!scale) {
      throw new Error("Vitest iframe data-scale attribute not found");
    }

    tester.dataset.bckTransform = tester.style.transform;
    tester.style.transform = `scale(1)`;
  }, VITEST_TESTER_ID);

  return async () => {
    await ctx.page.evaluate((testerId) => {
      const tester = document.getElementById(testerId);

      if (!(tester instanceof HTMLElement)) {
        return;
      }

      tester.style.transform = tester.dataset.bckTransform ?? "";
    }, VITEST_TESTER_ID);
  };
}

/**
 * Resize the Vitest iframe.
 *
 * The story/test renders inside an `<iframe data-vitest="true">` on the host
 * page and we screenshot the iframe's `<body>`. Anything overflowing the iframe
 * box is not painted, so the iframe must be sized to hold the content.
 *
 * @param size - The viewport size, `"default"` to keep the natural size, or
 *   `"initial"` to restore the size the iframe had before Argos resized it.
 * @param options.fullPage - When `true`, grow the height to fit the content
 *   while keeping the viewport width (Playwright-style full page).
 */
export async function setIframeViewportSize(
  ctx: BrowserCommandContext,
  size: ViewportSize | "default" | "initial",
  options: { fullPage?: boolean } = {},
): Promise<void> {
  await ctx.page.evaluate(
    ({ size, fullPage, selector, backupAttribute }) => {
      const iframe = document.querySelector(selector);

      if (!(iframe instanceof HTMLIFrameElement)) {
        throw new Error("Vitest iframe not found");
      }

      if (!iframe.contentDocument) {
        throw new Error("Vitest iframe contentDocument not found");
      }

      if (size === "initial") {
        const backup = iframe.getAttribute(backupAttribute);
        if (backup !== null) {
          const { width, height } = JSON.parse(backup);
          iframe.style.width = width;
          iframe.style.height = height;
          // Drop the backup so the next screenshot saves the size the iframe
          // actually has then, rather than restoring a stale one.
          iframe.removeAttribute(backupAttribute);
        }
        return;
      }

      if (!iframe.hasAttribute(backupAttribute)) {
        iframe.setAttribute(
          backupAttribute,
          JSON.stringify({
            width: iframe.style.width,
            height: iframe.style.height,
          }),
        );
      }

      if (size !== "default") {
        iframe.style.width = `${size.width}px`;
      }

      if (fullPage) {
        if (!iframe.contentWindow) {
          throw new Error(`Can't access iframe window`);
        }
        const viewportHeight =
          size === "default" ? iframe.contentWindow.innerHeight : size.height;

        iframe.style.height = "auto";
        iframe.style.height =
          viewportHeight < iframe.contentDocument.body.offsetHeight
            ? `${iframe.contentDocument.body.offsetHeight}px`
            : "100%";
      } else if (size !== "default") {
        iframe.style.height = "auto";
        iframe.style.height = `${size.height}px`;
      }
    },
    {
      size,
      fullPage: options.fullPage ?? false,
      selector: VITEST_IFRAME_SELECTOR,
      backupAttribute: SIZE_BACKUP_ATTRIBUTE,
    },
  );
}

/**
 * Grow the Vitest iframe to fit its content so nothing is clipped.
 *
 * This must run once the content has reached its final size — after `argosCSS`
 * (which may inject a `zoom`) is applied *and* after stabilization has waited
 * for images and fonts. `setIframeViewportSize` sizes the iframe before any of
 * that, so it can't account for the final content size. It only ever grows the
 * iframe, never shrinks it; use `setIframeViewportSize(ctx, "initial")` to
 * restore the original size afterwards.
 *
 * @param options.fitWidth - Also grow the iframe horizontally to paint content
 *   wider than the viewport. When `false`, only the height grows (to match
 *   Playwright's `fullPage` semantics: full height, viewport width).
 */
export async function fitIframeToContent(
  ctx: BrowserCommandContext,
  options: { fitWidth: boolean },
): Promise<void> {
  await ctx.page.evaluate(
    ({ fitWidth, selector, backupAttribute }) => {
      const iframe = document.querySelector(selector);

      if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentDocument) {
        return;
      }

      if (!iframe.hasAttribute(backupAttribute)) {
        iframe.setAttribute(
          backupAttribute,
          JSON.stringify({
            width: iframe.style.width,
            height: iframe.style.height,
          }),
        );
      }

      const { body, documentElement } = iframe.contentDocument;
      const contentHeight = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        documentElement.scrollHeight,
      );

      // Only grow, never shrink: the iframe must contain the full content so
      // it's painted, but we don't want to collapse an intentionally sized
      // viewport.
      if (contentHeight > iframe.clientHeight) {
        iframe.style.height = `${contentHeight}px`;
      }

      if (fitWidth) {
        const contentWidth = Math.max(
          body.scrollWidth,
          body.offsetWidth,
          documentElement.scrollWidth,
        );
        if (contentWidth > iframe.clientWidth) {
          iframe.style.width = `${contentWidth}px`;
        }
      }
    },
    {
      fitWidth: options.fitWidth,
      selector: VITEST_IFRAME_SELECTOR,
      backupAttribute: SIZE_BACKUP_ATTRIBUTE,
    },
  );
}
