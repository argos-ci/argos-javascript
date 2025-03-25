import type { Plugin } from "..";
import { injectGlobalStyles } from "../util";

/**
 * Hide scrollbars.
 */
export const plugin = {
  name: "hideScrollbars" as const,
  beforeAll() {
    return injectGlobalStyles(
      `::-webkit-scrollbar { display: none !important; }`,
      "hide-scrollbars",
    );
  },
} satisfies Plugin;
