import type { Plugin } from "..";

/**
 * Force the reload of srcset on resize.
 * To ensure that if the viewport changes, it's the same behaviour
 * as if the page was reloaded.
 */
export const plugin = {
  name: "loadImageSrcset" as const,
  beforeAll() {
    function addCacheBusterToSrc(src: string) {
      const url = new URL(src, window.location.href);
      url.searchParams.set("argosBust", String(Date.now()));
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

    function handleResize() {
      Array.from(document.images).forEach(forceSrcsetReload);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  },
} satisfies Plugin;
