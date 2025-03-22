import type { Plugin } from "..";

/**
 * Wait for fonts to be loaded.
 */
export const plugin: Plugin = {
  name: "fonts",
  wait: {
    for: (options) => {
      if (options.fonts === false) {
        return true;
      }
      return document.fonts.status === "loaded";
    },
    failureExplanation: "Some fonts have not been loaded",
  },
};
