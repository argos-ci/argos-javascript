import type { Plugin } from "..";

/**
 * Force the reload of srcset on resize.
 * To ensure that if the viewport changes, it's the same behaviour
 * as if the page was reloaded.
 */
export const plugin = {
  name: "loadImageSrcset" as const,
  beforeEach(options) {
    // If the user is not using viewports, do nothing.
    if (!options.viewports || options.viewports.length === 0) {
      return undefined;
    }

    function getLargestSrcFromSrcset(srcset: string) {
      // Parse srcset into array of {url, width}
      const sources = srcset
        .split(",")
        .map((item) => {
          const [url, size] = item.trim().split(/\s+/);
          if (!url) {
            return null;
          }
          // Only handle width descriptors (e.g., 800w)
          const widthMatch = size && size.match(/^(\d+)w$/);
          if (!widthMatch) {
            return { url, width: 0 };
          }
          const width = parseInt(widthMatch[1]!, 10);
          return { url, width };
        })
        .filter((x) => x !== null);

      if (sources.length === 0) {
        return srcset;
      }

      // Find the source with the largest width
      const largest = sources.reduce((max, curr) =>
        curr.width > max.width ? curr : max,
      );

      // Return only the largest source as srcset
      return largest.url;
    }

    function forceSrcsetReload(img: Element) {
      const srcset = img.getAttribute("srcset");
      if (!srcset) {
        return;
      }
      img.setAttribute("srcset", getLargestSrcFromSrcset(srcset));
    }

    Array.from(document.querySelectorAll("img,source")).forEach(
      forceSrcsetReload,
    );
  },
} satisfies Plugin;
