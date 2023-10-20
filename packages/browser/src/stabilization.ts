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
 * Disable spellcheck to avoid displaying markers.
 */
export function disableSpellCheck(document: Document) {
  const query =
    "[contenteditable]:not([contenteditable=false]):not([spellcheck=false]), input:not([spellcheck=false]), textarea:not([spellcheck=false])";
  const inputs = document.querySelectorAll(query);
  inputs.forEach((input) => input.setAttribute("spellcheck", "false"));
}

/**
 *
 */
export function injectGlobalStyles(document: Document) {
  const style = document.createElement("style");
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

/**
 * Prepare the document for a screenshot.
 */
export function prepareForScreenshot(document: Document) {
  injectGlobalStyles(document);
  disableSpellCheck(document);
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
