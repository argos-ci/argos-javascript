import type { Plugin } from "..";

/**
 * Wait for images to be loaded.
 */
export const plugin: Plugin = {
  name: "images",
  beforeEach() {
    Array.from(document.images).every((img) => {
      // Force sync decoding
      if (img.decoding !== "sync") {
        img.decoding = "sync";
      }

      // Force eager loading
      if (img.loading !== "eager") {
        img.loading = "eager";
      }
    });
    return undefined;
  },
  wait: {
    for: (options) => {
      if (options.images === false) {
        return true;
      }

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
};
