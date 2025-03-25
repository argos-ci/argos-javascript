import type { Plugin } from "..";

/**
 * Force the reload of srcset on resize.
 * To ensure that if the viewport changes, it's the same behaviour
 * as if the page was reloaded.
 */
export const plugin = {
  name: "loadImageSrcset" as const,
  beforeAll() {
    const handleResize = () => {
      Array.from(document.images).forEach((img) => {
        const srcset = img.getAttribute("srcset");
        if (srcset) {
          img.setAttribute("srcset", "");
          // Force reflow
          void img.offsetWidth;
          img.setAttribute("srcset", srcset);
        }
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  },
} satisfies Plugin;
