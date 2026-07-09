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
 *   `"initial"` to restore the size backed up on the first resize.
 * @param options.fullPage - When `true`, grow the height to fit the content
 *   while keeping the viewport width (Playwright-style full page).
 */
export async function setIframeViewportSize(
  ctx: BrowserCommandContext,
  size: ViewportSize | "default" | "initial",
  options: { fullPage?: boolean } = {},
): Promise<void> {
  await ctx.page.evaluate(
    ({ size, fullPage, selector }) => {
      const iframe = document.querySelector(selector);

      if (!(iframe instanceof HTMLIFrameElement)) {
        throw new Error("Vitest iframe not found");
      }

      if (!iframe.contentDocument) {
        throw new Error("Vitest iframe contentDocument not found");
      }

      if (size === "initial") {
        if (iframe.dataset.initialWidth && iframe.dataset.initialHeight) {
          iframe.style.width = iframe.dataset.initialWidth;
          iframe.style.height = iframe.dataset.initialHeight;
        }
        return;
      }

      // Backup default width/height if not set
      if (!iframe.dataset.initialWidth && !iframe.dataset.initialHeight) {
        iframe.dataset.initialWidth = iframe.style.width;
        iframe.dataset.initialHeight = iframe.style.height;
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
    },
  );
}

/**
 * Grow the Vitest iframe to fit its content so nothing is clipped.
 *
 * This must run *after* `argosCSS` (which may inject a `zoom`) is applied,
 * because `setIframeViewportSize` sizes the iframe *before* the content's final
 * size is known. It only ever grows the iframe, never shrinks it.
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
    ({ fitWidth, selector }) => {
      const iframe = document.querySelector(selector);

      if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentDocument) {
        return;
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
    { fitWidth: options.fitWidth, selector: VITEST_IFRAME_SELECTOR },
  );
}
