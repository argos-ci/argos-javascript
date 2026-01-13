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
      if (!img.complete || img.naturalWidth === 0) {
        return;
      }

      // Backup only once
      if (!img.hasAttribute(BACKUP_ATTRIBUTE_WIDTH)) {
        img.setAttribute(BACKUP_ATTRIBUTE_WIDTH, img.style.width);
        img.setAttribute(BACKUP_ATTRIBUTE_HEIGHT, img.style.height);
      }

      img.style.width = `${Math.round(img.offsetWidth)}px`;
      img.style.height = `${Math.round(img.offsetHeight)}px`;
    });

    return () => {
      Array.from(document.images).forEach((img) => {
        // Only restore if we actually backed up this image
        if (!img.hasAttribute(BACKUP_ATTRIBUTE_WIDTH)) {
          return;
        }

        const bckWidth = img.getAttribute(BACKUP_ATTRIBUTE_WIDTH);
        const bckHeight = img.getAttribute(BACKUP_ATTRIBUTE_HEIGHT);

        img.style.width = bckWidth ?? "";
        img.style.height = bckHeight ?? "";

        img.removeAttribute(BACKUP_ATTRIBUTE_WIDTH);
        img.removeAttribute(BACKUP_ATTRIBUTE_HEIGHT);
      });
    };
  },
} satisfies Plugin;
