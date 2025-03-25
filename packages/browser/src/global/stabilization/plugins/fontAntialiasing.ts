import type { Plugin } from "..";
import { injectGlobalStyles } from "../util";

/**
 * Enable antialiasing for fonts.
 */
export const plugin = {
  name: "fontAntialiasing" as const,
  beforeAll() {
    return injectGlobalStyles(
      `* { -webkit-font-smoothing: antialiased !important; }`,
      "font-antialiasing",
    );
  },
} satisfies Plugin;
