import type { Plugin } from "..";
import { injectGlobalStyles } from "../util";

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
} satisfies Plugin;
