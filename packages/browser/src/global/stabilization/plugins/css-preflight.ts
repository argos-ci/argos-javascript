import type { Plugin } from "..";
import { injectGlobalStyles } from "../util";

const PREFLIGHT_CSS: string = `
/* Hide carets */
* {
  caret-color: transparent !important;
}

/* Reduce text-aliasing issues in Blink browsers */
* {
  -webkit-font-smoothing: antialiased !important;
}

/* Hide scrollbars */
::-webkit-scrollbar {
  display: none !important;
}

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

const ID = "preflight";

/**
 * Inject preflight CSS styles to the document.
 */
export const plugin: Plugin = {
  name: "css-preflight",
  beforeAll() {
    injectGlobalStyles(PREFLIGHT_CSS, ID);
    return () => {
      const style = document.getElementById(ID);
      if (style) {
        style.remove();
      }
    };
  },
};
