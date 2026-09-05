import type { BrowserCommandContext } from "vitest/node";
import type { ViewportSize } from "@argos-ci/browser";

/**
 * Selector of the iframe Vitest renders the test into on the orchestrator page.
 */
export const VITEST_IFRAME_SELECTOR = 'iframe[data-vitest="true"]';

/**
 * ID of the Vitest "tester" element wrapping the iframe.
 */
export const VITEST_TESTER_ID = "vitest-tester";

/**
 * Dataset key holding the tester's inline `transform` from before Argos reset
 * it.
 *
 * The presence of the key — not the value it holds — is what marks the
 * transform as backed up: the original inline `transform` is usually an empty
 * string, which is indistinguishable from "nothing was saved yet".
 */
const TRANSFORM_BACKUP_KEY = "argosBckTransform";

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
 * Undo the scale Vitest applies to the `#vitest-tester` element, so the
 * screenshot is captured at full size instead of shrunk.
 *
 * Only some Vitest versions scale the tester. Up to Vitest 4 a viewport larger
 * than the browser window is emulated by sizing the tester to the requested
 * viewport and shrinking it with a CSS `transform: scale(...)`. From Vitest 5
 * the real browser viewport is resized instead, so the tester carries no
 * transform and there is nothing to undo — which is why an unscaled tester is
 * a no-op rather than an error.
 *
 * Detection reads the *computed* transform, so a scale set from a stylesheet
 * counts too, while the override goes on the inline style, which is the only
 * layer guaranteed to win.
 *
 * @returns A function restoring the transform after the screenshot.
 */
export async function resetTesterScale(
  ctx: BrowserCommandContext,
): Promise<() => Promise<void>> {
  await ctx.page.evaluate(resetTesterScaleInPage, {
    testerId: VITEST_TESTER_ID,
    backupKey: TRANSFORM_BACKUP_KEY,
  });

  return async () => {
    await ctx.page.evaluate(restoreTesterScaleInPage, {
      testerId: VITEST_TESTER_ID,
      backupKey: TRANSFORM_BACKUP_KEY,
    });
  };
}

/**
 * Body of {@link resetTesterScale}, running in the page.
 *
 * Exported for tests only, and self-contained on purpose: it is serialized to
 * the browser by `page.evaluate`, so it can reference nothing but its argument
 * and page globals.
 */
export function resetTesterScaleInPage(args: {
  testerId: string;
  backupKey: string;
}): void {
  const { testerId, backupKey } = args;
  const tester = document.getElementById(testerId);

  if (!(tester instanceof HTMLElement)) {
    return;
  }

  const { transform } = getComputedStyle(tester);

  if (!transform || transform === "none") {
    return;
  }

  // `a` and `d` are the horizontal and vertical scale factors; both at 1 means
  // the transform does not resize the tester, whatever else it does.
  const matrix = new DOMMatrixReadOnly(transform);

  if (matrix.a === 1 && matrix.d === 1) {
    return;
  }

  tester.dataset[backupKey] = tester.style.transform;
  tester.style.transform = "scale(1)";
}

/**
 * Body of the function {@link resetTesterScale} returns, running in the page.
 *
 * Exported for tests only, and self-contained for the same reason as
 * {@link resetTesterScaleInPage}.
 */
export function restoreTesterScaleInPage(args: {
  testerId: string;
  backupKey: string;
}): void {
  const { testerId, backupKey } = args;
  const tester = document.getElementById(testerId);

  if (!(tester instanceof HTMLElement)) {
    return;
  }

  const backup = tester.dataset[backupKey];

  // Nothing was reset — leave the tester alone rather than clearing a
  // transform this never touched.
  if (backup === undefined) {
    return;
  }

  tester.style.transform = backup;
  delete tester.dataset[backupKey];
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
