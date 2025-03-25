import type { Plugin } from "..";

/**
 * Add a global class to the document element.
 */
export const plugin = {
  name: "addArgosClass" as const,
  beforeAll() {
    const className = "__argos__";
    document.documentElement.classList.add(className);
    return () => {
      document.documentElement.classList.remove(className);
    };
  },
} satisfies Plugin;
