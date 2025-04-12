import type { Plugin } from "..";

/**
 * Check if an element is visible.
 */
function checkIsElementVisible(element: Element) {
  // Basic check for HTMLElement
  if (
    element instanceof HTMLElement &&
    (element.offsetHeight !== 0 || element.offsetWidth !== 0)
  ) {
    return true;
  }
  // Check for HTMLElement & SVGElement
  return element.getClientRects().length > 0;
}

/**
 * Wait for [aria-busy="true"] elements to be invisible.
 */
export const plugin = {
  name: "waitForAriaBusy" as const,
  wait: {
    for: () => {
      return Array.from(document.querySelectorAll('[aria-busy="true"]')).every(
        (element) => !checkIsElementVisible(element),
      );
    },
    failureExplanation: "Some elements still have `aria-busy='true'`",
  },
} satisfies Plugin;
