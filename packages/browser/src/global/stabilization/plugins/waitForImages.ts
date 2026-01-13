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
        return img.complete && img.naturalWidth > 0;
      });
    },
    failureExplanation: "Some images have not been loaded",
  },
} satisfies Plugin;
