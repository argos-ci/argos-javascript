import type { Plugin } from "..";
import { injectGlobalStyles, removeGlobalStyles } from "../util";

const ID = "custom";

/**
 * Inject custom CSS into the document.
 */
export const plugin: Plugin = {
  name: "css-custom",
  beforeAll(options) {
    if (options.argosCSS) {
      injectGlobalStyles(options.argosCSS, ID);
      return () => {
        removeGlobalStyles(ID);
      };
    }
    return undefined;
  },
};
