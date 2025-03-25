import type { Plugin } from "..";

const UNSET = "--unset";
const BACKUP_ATTRIBUTE = "data-argos-bck-spellcheck";

/**
 * Disable spellcheck to avoid displaying markers.
 */
export const plugin = {
  name: "disableSpellcheck" as const,
  beforeAll() {
    document
      .querySelectorAll(
        "[contenteditable]:not([contenteditable=false]), input, textarea",
      )
      .forEach((element) => {
        const spellcheck = element.getAttribute("spellcheck");

        // If spellcheck already set to false, do nothing.
        if (spellcheck === "false") {
          return;
        }

        element.setAttribute(BACKUP_ATTRIBUTE, spellcheck ?? UNSET);
        element.setAttribute("spellcheck", "false");
      });

    return () => {
      document.querySelectorAll(`[${BACKUP_ATTRIBUTE}]`).forEach((input) => {
        const bckSpellcheck = input.getAttribute(BACKUP_ATTRIBUTE);

        if (bckSpellcheck === UNSET) {
          input.removeAttribute("spellcheck");
        } else if (bckSpellcheck) {
          input.setAttribute("spellcheck", bckSpellcheck);
        }

        input.removeAttribute(BACKUP_ATTRIBUTE);
      });
    };
  },
} satisfies Plugin;
