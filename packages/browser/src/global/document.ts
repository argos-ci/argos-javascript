/**
 * Get the scroll position and the size of the document, as captured by a
 * full page screenshot.
 */
export function getDocumentMetrics() {
  const { body, documentElement } = document;
  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    // The size Playwright gives to full page screenshots.
    width: Math.max(
      body?.scrollWidth ?? 0,
      documentElement.scrollWidth,
      body?.offsetWidth ?? 0,
      documentElement.offsetWidth,
      body?.clientWidth ?? 0,
      documentElement.clientWidth,
    ),
    height: Math.max(
      body?.scrollHeight ?? 0,
      documentElement.scrollHeight,
      body?.offsetHeight ?? 0,
      documentElement.offsetHeight,
      body?.clientHeight ?? 0,
      documentElement.clientHeight,
    ),
  };
}
