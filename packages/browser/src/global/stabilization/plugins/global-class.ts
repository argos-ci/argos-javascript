import type { Plugin } from "..";

const GLOBAL_CLASS = "__argos__";

/**
 * Add a global class to the document element.
 */
export const plugin: Plugin = {
  name: "global-class",
  beforeAll() {
    document.documentElement.classList.add(GLOBAL_CLASS);
    return () => {
      document.documentElement.classList.remove(GLOBAL_CLASS);
    };
  },
};
