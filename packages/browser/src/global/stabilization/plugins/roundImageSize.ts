import type { Plugin } from "..";

const BACKUP_ATTRIBUTE_WIDTH = "data-argos-bck-width";
const BACKUP_ATTRIBUTE_HEIGHT = "data-argos-bck-height";

/**
 * Round all image sizes to stabilize images rendering.
 */
export const plugin = {
  name: "roundImageSize" as const,
  beforeEach() {
    Array.from(document.images).forEach((img) => {
      // Skip images that are not loaded yet.
      if (!img.complete) {
        return;
      }

      // Backup the original width and height
      img.setAttribute(BACKUP_ATTRIBUTE_WIDTH, img.style.width);
      img.setAttribute(BACKUP_ATTRIBUTE_HEIGHT, img.style.height);

      // Set the width and height to the rounded values
      const rect = img.getBoundingClientRect();
      img.style.width = `${Math.round(rect.width)}px`;
      img.style.height = `${Math.round(rect.height)}px`;
    });

    return () => {
      Array.from(document.images).forEach((img) => {
        const bckWidth = img.getAttribute(BACKUP_ATTRIBUTE_WIDTH);
        const bckHeight = img.getAttribute(BACKUP_ATTRIBUTE_HEIGHT);

        if (bckWidth === null && bckHeight === null) {
          return;
        }

        // Restore the original width and height
        img.style.width = bckWidth ?? "";
        img.style.height = bckHeight ?? "";

        // Remove the backup attributes
        img.removeAttribute(BACKUP_ATTRIBUTE_WIDTH);
        img.removeAttribute(BACKUP_ATTRIBUTE_HEIGHT);
      });
    };
  },
} satisfies Plugin;
