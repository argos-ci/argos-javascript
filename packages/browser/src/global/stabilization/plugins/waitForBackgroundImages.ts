import type { Plugin, WaitForBackgroundImagesOptions } from "..";

/**
 * Images preloaded for the current screenshot cycle.
 * Populated by a single DOM scan in `beforeEach` and polled cheaply in
 * `wait.for` (we only read `img.complete`, never re-scan the DOM).
 */
const preloadedImages = new Set<HTMLImageElement>();

const URL_REGEX = /url\((['"]?)([^'")]+)\1\)/g;

/**
 * Extract non-data background-image URLs from a computed `background-image`
 * value (which may contain several layered backgrounds and gradients).
 */
function collectUrls(
  value: string | null | undefined,
  urls: Set<string>,
): void {
  if (!value || value === "none") {
    return;
  }
  URL_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_REGEX.exec(value)) !== null) {
    const url = match[2];
    // `getComputedStyle` resolves background URLs to absolute URLs, so they can
    // be assigned directly to `Image.src`. Skip inlined data URIs.
    if (url && !url.startsWith("data:")) {
      urls.add(url);
    }
  }
}

/**
 * Resolve the selector scoping the scan, defaulting to the whole document.
 */
function resolveSelector(options: unknown): string {
  if (options && typeof options === "object") {
    const { selector } = options as WaitForBackgroundImagesOptions;
    if (typeof selector === "string" && selector.trim() !== "") {
      return selector;
    }
  }
  return "*";
}

/**
 * Wait for CSS background images to be loaded.
 *
 * There is no native load event for CSS background images, so URLs are
 * discovered with `getComputedStyle` and preloaded through `Image` objects.
 *
 * This plugin is opt-in because the scan is resource-intensive. Enable it with
 * `stabilize: { waitForBackgroundImages: true }` to scan the whole document, or
 * scope it on large pages with
 * `stabilize: { waitForBackgroundImages: { selector: ".hero, [data-bg]" } }`.
 *
 * The expensive scan runs only once per viewport in `beforeEach`; `wait.for`
 * just polls the preloaded images.
 */
export const plugin = {
  name: "waitForBackgroundImages" as const,
  optIn: true,
  beforeEach(_context, options) {
    const selector = resolveSelector(options);
    const urls = new Set<string>();

    document.querySelectorAll(selector).forEach((element) => {
      collectUrls(window.getComputedStyle(element).backgroundImage, urls);
      // Pseudo-elements are a common home for decorative background images.
      collectUrls(
        window.getComputedStyle(element, "::before").backgroundImage,
        urls,
      );
      collectUrls(
        window.getComputedStyle(element, "::after").backgroundImage,
        urls,
      );
    });

    urls.forEach((url) => {
      const img = new Image();
      img.decoding = "sync";
      img.src = url;
      preloadedImages.add(img);
    });

    return () => {
      preloadedImages.clear();
    };
  },
  wait: {
    for: () => {
      // Intentionally only check `complete` (which is also `true` on error), so
      // a failing background image (e.g. 404) does not block stabilization.
      return Array.from(preloadedImages).every((img) => img.complete);
    },
    failureExplanation: "Some background images are still loading",
  },
} satisfies Plugin;
