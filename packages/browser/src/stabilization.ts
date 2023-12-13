/**
 * CSS to stabilize visual tests:
 * - Hide carets
 * - Hide scrollbars
 * - Support [data-visual-test]
 * - Support [data-visual-test-no-radius]
 */
export const GLOBAL_CSS: string = `
/* Hide carets */
* {
  caret-color: transparent !important;
}

/* Hide scrollbars */
::-webkit-scrollbar {
  display: none !important;
}

/* Make the element transparent */
[data-visual-test="transparent"] {
  color: transparent !important;
  font-family: monospace !important;
  opacity: 0 !important;
}

/* Remove the element */
[data-visual-test="removed"] {
  display: none !important;
}

/* Disable radius */
[data-visual-test-no-radius]:not([data-visual-test-no-radius="false"]) {
  border-radius: 0 !important;
}
`;

/**
 * Set the position of an element and backup the previous one.
 */
function setAndBackupSpellcheck(element: HTMLElement, spellcheck: string) {
  element.setAttribute(
    "data-argos-bck-position",
    element.getAttribute("spellcheck") ?? "unset",
  );
  element.setAttribute("spellcheck", spellcheck);
}

const SPELL_CHECK_QUERY =
  "[contenteditable]:not([contenteditable=false]):not([spellcheck=false]), input:not([spellcheck=false]), textarea:not([spellcheck=false])";

/**
 * Disable spellcheck to avoid displaying markers.
 */
export function disableSpellCheck(document: Document) {
  const inputs = document.querySelectorAll(SPELL_CHECK_QUERY);
  inputs.forEach((element) => {
    if (!checkIsHTMLElement(element)) return;
    setAndBackupSpellcheck(element, "false");
  });
}

/**
 * Restore spellcheck attribute.
 */
export function restoreSpellCheck(document: Document) {
  const inputs = document.querySelectorAll(SPELL_CHECK_QUERY);
  inputs.forEach((input) => {
    const spellcheck = input.getAttribute("data-argos-bck-spellcheck");
    if (spellcheck === "unset") {
      input.removeAttribute("spellcheck");
    } else if (spellcheck) {
      input.setAttribute("spellcheck", spellcheck);
    }
  });
}

/**
 * Inject global styles in the DOM.
 */
export function injectGlobalStyles(
  document: Document,
  css: string,
  id: string,
) {
  const style = document.createElement("style");
  style.textContent = css;
  style.id = id;
  document.head.appendChild(style);
}

/**
 * Remove global styles from the DOM.
 */
export function removeGlobalStyles(document: Document, id: string) {
  const style = document.getElementById(id);
  if (style) {
    style.remove();
  }
}

const checkIsHTMLElement = (element: Element): element is HTMLElement => {
  return "style" in element;
};

/**
 * Set the position of an element and backup the previous one.
 */
function setAndBackupPosition(element: HTMLElement, position: string) {
  element.setAttribute(
    "data-argos-bck-position",
    element.style.position ?? "unset",
  );
  element.style.position = position;
}

/**
 * Stabilize sticky and fixed elements.
 */
export function stabilizeElementPositions(document: Document) {
  const window = document.defaultView;
  if (!window) return;
  const elements = Array.from(document.querySelectorAll("*"));
  elements.forEach((element) => {
    if (!checkIsHTMLElement(element)) return;
    const style = window.getComputedStyle(element);
    const position = style.position;
    if (position === "fixed") {
      setAndBackupPosition(element, "absolute");
    } else if (position === "sticky") {
      setAndBackupPosition(element, "relative");
    }
  });
}

/**
 * Restore the position of elements.
 */
export function restoreElementPositions(document: Document) {
  const window = document.defaultView;
  if (!window) return;
  const elements = Array.from(document.querySelectorAll("*"));
  elements.forEach((element) => {
    if (!checkIsHTMLElement(element)) return;
    const position = element.getAttribute("data-argos-bck-position");
    if (position === "unset") {
      element.style.removeProperty("position");
    } else if (position) {
      element.style.position = position;
    }
  });
}

export type SetupOptions = { fullPage?: boolean; argosCSS?: string };

/**
 * Setup the document for screenshots.
 */
export function setup(
  document: Document,
  { fullPage, argosCSS }: SetupOptions = {},
) {
  injectGlobalStyles(document, GLOBAL_CSS, "argos-reset-style");
  if (argosCSS) {
    injectGlobalStyles(document, argosCSS, "argos-user-style");
  }
  disableSpellCheck(document);
  if (fullPage) {
    stabilizeElementPositions(document);
  }
}

export type TeardownOptions = { fullPage?: boolean; argosCSS?: string };

/**
 * Restore the document after screenshots.
 */
export function teardown(
  document: Document,
  { fullPage, argosCSS }: SetupOptions = {},
) {
  removeGlobalStyles(document, "argos-reset-style");
  if (argosCSS) {
    removeGlobalStyles(document, "argos-user-style");
  }
  restoreSpellCheck(document);
  if (fullPage) {
    restoreElementPositions(document);
  }
}

/**
 * Wait for the fonts to be loaded.
 */
export function waitForFontsToLoad(document: Document) {
  return document.fonts.status === "loaded";
}

/**
 * Wait for the images to be loaded.
 */
export function waitForImagesToLoad(document: Document) {
  const images = Array.from(document.images);

  // Force eager loading
  images.forEach((img) => {
    if (img.loading !== "eager") {
      img.loading = "eager";
    }
  });

  return images.every((img) => img.complete);
}

/**
 * Wait for all [aria-busy="true"] elements to invisible.
 */
export function waitForNoBusy(document: Document) {
  const checkIsVisible = (element: HTMLElement) =>
    Boolean(
      element.offsetWidth ||
        element.offsetHeight ||
        element.getClientRects().length,
    );

  const elements = Array.from(document.querySelectorAll('[aria-busy="true"]'));
  return elements.every((element) => {
    return !(element instanceof HTMLElement) || !checkIsVisible(element);
  });
}

/**
 * Wait for the document to be stable.
 */
export function waitForStability(document: Document) {
  const results = [
    waitForNoBusy(document),
    waitForImagesToLoad(document),
    waitForFontsToLoad(document),
  ];
  return results.every(Boolean);
}
