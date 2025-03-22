import type { Plugin, SetupOptions } from "..";

const BACKUP_ATTRIBUTE = "data-argos-bck-position";

/**
 * Set the position of an element and backup the previous one.
 */
function setAndBackupPosition(element: HTMLElement, position: string) {
  // Check if position is equivalent by comparing the coords before and after setting it
  const previousPosition = element.style.position;
  const previousRect = element.getBoundingClientRect();
  element.style.position = position;
  const currentRect = element.getBoundingClientRect();

  // If the position is not equivalent, restore the previous one
  if (previousRect.x !== currentRect.x || previousRect.y !== currentRect.y) {
    element.style.position = previousPosition;
    return;
  }

  // If the position is equivalent, keep the new position and backup the previous one
  element.setAttribute(BACKUP_ATTRIBUTE, previousPosition ?? "unset");
}

/**
 * Stabilize sticky and fixed elements.
 */
export const plugin: Plugin = {
  name: "element-position",
  beforeAll(options: SetupOptions) {
    // If fullPage is not enabled, do nothing.
    if (!options.fullPage) {
      return undefined;
    }

    document.querySelectorAll("*").forEach((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }

      const style = window.getComputedStyle(element);
      const { position } = style;

      if (position === "fixed") {
        setAndBackupPosition(element, "absolute");
      } else if (position === "sticky") {
        setAndBackupPosition(element, "relative");
      }
    });

    return () => {
      document.querySelectorAll(`[${BACKUP_ATTRIBUTE}]`).forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }

        const position = element.getAttribute(BACKUP_ATTRIBUTE);

        if (!position) {
          return;
        }

        if (position === "unset") {
          element.style.removeProperty("position");
        } else {
          element.style.position = position;
        }

        element.removeAttribute(BACKUP_ATTRIBUTE);
      });
    };
  },
};
