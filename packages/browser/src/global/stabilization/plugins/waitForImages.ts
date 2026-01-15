import type { Plugin } from "..";

/**
 * Wait for images to be loaded.
 */
export const plugin = {
  name: "waitForImages" as const,
  beforeEach() {
    Array.from(document.images).forEach((img) => {
      if (img.decoding !== "sync") {
        img.decoding = "sync";
      }
      if (img.loading !== "eager") {
        img.loading = "eager";
      }
    });
    return undefined;
  },
  wait: {
    for: () => {
      return Array.from(document.images).every((img) => {
        if (img.decoding !== "sync") {
          img.decoding = "sync";
        }
        if (img.loading !== "eager") {
          img.loading = "eager";
        }
        // Intentionally only check `img.complete` and not `naturalWidth > 0`.
        // This allows screenshots/stabilization to proceed even when some images
        // fail to load (e.g. 404s), so unavailable image resources do not block.
        return img.complete;
      });
    },
    failureExplanation: "Some images are still loading",
  },
} satisfies Plugin;
