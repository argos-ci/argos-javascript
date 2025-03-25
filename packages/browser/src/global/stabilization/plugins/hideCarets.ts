import type { Plugin } from "..";
import { injectGlobalStyles } from "../util";

/**
 * Hide carets.
 */
export const plugin = {
  name: "hideCarets" as const,
  beforeAll() {
    return injectGlobalStyles(
      `* { caret-color: transparent !important; }`,
      "hide-carets",
    );
  },
} satisfies Plugin;
