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

    function addCacheBusterToSrc(src: string) {
      const url = new URL(src, window.location.href);
      if (!url.hash || url.hash.match(/^#argosBust=\d+$/)) {
        url.hash = `argosBust=${String(Date.now())}`;
      } else {
        url.searchParams.set("argosBust", String(Date.now()));
      }
      return url.toString();
    }

    function bustSrcset(srcset: string) {
      return srcset
        .split(",")
        .map((item) => {
          const [url, size] = item.trim().split(/\s+/);
          if (!url) {
            return item;
          }
          const bustedUrl = addCacheBusterToSrc(url);
          return size ? `${bustedUrl} ${size}` : bustedUrl;
        })
        .join(", ");
    }

    function forceSrcsetReload(img: HTMLImageElement) {
      const srcset = img.getAttribute("srcset");
      if (!srcset) {
        return;
      }
      img.setAttribute("srcset", bustSrcset(srcset));
    }

    Array.from(document.images).forEach(forceSrcsetReload);
  },
} satisfies Plugin;
