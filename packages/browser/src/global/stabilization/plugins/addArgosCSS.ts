import type { Plugin } from "..";
import { injectGlobalStyles } from "../util";

/**
 * Inject custom CSS into the document.
 */
export const plugin = {
  name: "addArgosCSS" as const,
  beforeAll(options) {
    if (options.argosCSS) {
      return injectGlobalStyles(options.argosCSS, "custom-css");
    }
    return undefined;
  },
} satisfies Plugin;
