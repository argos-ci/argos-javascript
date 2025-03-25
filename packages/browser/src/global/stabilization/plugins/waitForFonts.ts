import type { Plugin } from "..";

/**
 * Wait for fonts to be loaded.
 */
export const plugin = {
  name: "waitForFonts" as const,
  wait: {
    for: () => {
      return document.fonts.status === "loaded";
    },
    failureExplanation: "Some fonts have not been loaded",
  },
} satisfies Plugin;
