import type { Plugin } from "..";

/**
 * Wait for images to be loaded.
 */
export const plugin = {
  name: "waitForImages" as const,
  wait: {
    for: () => {
      const images = Array.from(document.images);

      const results = images.map((img) => {
        // Force sync decoding
        if (img.decoding !== "sync") {
          img.decoding = "sync";
        }

        // Force eager loading
        if (img.loading !== "eager") {
          img.loading = "eager";
        }

        return img.complete;
      });

      return results.every((x) => x);
    },
    failureExplanation: "Some images have not been loaded",
  },
} satisfies Plugin;
