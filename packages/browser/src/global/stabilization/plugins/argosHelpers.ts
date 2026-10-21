import type { Plugin } from "..";
import { injectGlobalStyles } from "../util";

const HELPER_ATTRIBUTE = "data-visual-test";

/**
 * Argos helpers that can be applied to elements from the SDKs, from the
 * weakest to the strongest.
 */
const HELPERS = ["transparent", "removed"] as const;

export type ArgosHelper = (typeof HELPERS)[number];

/**
 * Original `data-visual-test` value of the elements a helper was applied to,
 * `null` when the element had no attribute.
 */
const originalHelpers = new Map<Element, string | null>();

/**
 * Apply an Argos helper to elements, as if they had the matching
 * `data-visual-test` attribute, until `afterEach` runs.
 * An element receiving several helpers keeps the strongest one.
 */
export function applyHelper(elements: Element[], helper: ArgosHelper) {
  for (const element of elements) {
    if (!originalHelpers.has(element)) {
      originalHelpers.set(element, element.getAttribute(HELPER_ATTRIBUTE));
    } else if (
      HELPERS.indexOf(element.getAttribute(HELPER_ATTRIBUTE) as ArgosHelper) >
      HELPERS.indexOf(helper)
    ) {
      continue;
    }
    element.setAttribute(HELPER_ATTRIBUTE, helper);
  }
}

/**
 * Restore the `data-visual-test` attribute of every element a helper was
 * applied to.
 */
export function restoreHelpers() {
  originalHelpers.forEach((value, element) => {
    if (value === null) {
      element.removeAttribute(HELPER_ATTRIBUTE);
    } else {
      element.setAttribute(HELPER_ATTRIBUTE, value);
    }
  });
  originalHelpers.clear();
}

/**
 * Inject CSS for Argos helpers.
 */
export const plugin = {
  name: "argosHelpers" as const,
  beforeAll() {
    const styles = `
/* Make the element transparent */
[data-visual-test="transparent"] {
  color: transparent !important;
  font-family: monospace !important;
  opacity: 0 !important;
}

/* Remove the element */
[data-visual-test="removed"] {
  display: none !important;
}

/* Disable radius */
[data-visual-test-no-radius]:not([data-visual-test-no-radius="false"]) {
  border-radius: 0 !important;
}
    `;

    return injectGlobalStyles(styles, "argos-helpers");
  },
  beforeEach() {
    return restoreHelpers;
  },
} satisfies Plugin;
