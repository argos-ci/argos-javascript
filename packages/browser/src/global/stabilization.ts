/**
 * CSS to stabilize visual tests:
 * - Hide carets
 * - Hide scrollbars
 * - Support [data-visual-test]
 * - Support [data-visual-test-no-radius]
 */
const GLOBAL_CSS: string = `
/* Hide carets */
* {
  caret-color: transparent !important;
}

/* Reduce text-aliasing issues in Blink browsers */
* {
  -webkit-font-smoothing: antialiased !important;
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
    "data-argos-bck-spellcheck",
    element.getAttribute("spellcheck") ?? "unset",
  );
  element.setAttribute("spellcheck", spellcheck);
}

const SPELL_CHECK_QUERY =
  "[contenteditable]:not([contenteditable=false]):not([spellcheck=false]), input:not([spellcheck=false]), textarea:not([spellcheck=false])";

/**
 * Disable spellcheck to avoid displaying markers.
 */
function disableSpellCheck(document: Document) {
  const inputs = document.querySelectorAll(SPELL_CHECK_QUERY);
  inputs.forEach((element) => {
    if (!checkIsHTMLElement(element)) {
      return;
    }
    setAndBackupSpellcheck(element, "false");
  });
}

/**
 * Restore spellcheck attribute.
 */
function restoreSpellCheck(document: Document) {
  const inputs = document.querySelectorAll(SPELL_CHECK_QUERY);
  inputs.forEach((input) => {
    const spellcheck = input.getAttribute("data-argos-bck-spellcheck");
    if (spellcheck === "unset") {
      input.removeAttribute("spellcheck");
    } else if (spellcheck) {
      input.setAttribute("spellcheck", spellcheck);
    }
    input.removeAttribute("data-argos-bck-spellcheck");
  });
}

/**
 * Inject global styles in the DOM.
 */
function injectGlobalStyles(document: Document, css: string, id: string) {
  const style = document.createElement("style");
  style.textContent = css;
  style.id = id;
  document.head.appendChild(style);
}

/**
 * Remove global styles from the DOM.
 */
function removeGlobalStyles(document: Document, id: string) {
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
  element.setAttribute("data-argos-bck-position", previousPosition ?? "unset");
}

/**
 * Stabilize sticky and fixed elements.
 */
function stabilizeElementPositions(document: Document) {
  const window = document.defaultView;
  if (!window) {
    return;
  }
  const elements = Array.from(document.querySelectorAll("*"));
  elements.forEach((element) => {
    if (!checkIsHTMLElement(element)) {
      return;
    }
    if (element.tagName === "IFRAME") {
      return;
    }
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
function restoreElementPositions(document: Document) {
  const window = document.defaultView;
  if (!window) {
    return;
  }
  const elements = Array.from(document.querySelectorAll("*"));
  elements.forEach((element) => {
    if (!checkIsHTMLElement(element)) {
      return;
    }
    const position = element.getAttribute("data-argos-bck-position");
    if (position === "unset") {
      element.style.removeProperty("position");
    } else if (position) {
      element.style.position = position;
    }
    element.removeAttribute("data-argos-bck-position");
  });
}

function addGlobalClass(document: Document, className: string) {
  document.documentElement.classList.add(className);
}

function removeGlobalClass(document: Document, className: string) {
  document.documentElement.classList.remove(className);
}

export type SetupOptions = { fullPage?: boolean; argosCSS?: string };

/**
 * Setup the document for screenshots.
 */
export function setup(
  document: Document,
  { fullPage, argosCSS }: SetupOptions = {},
) {
  addGlobalClass(document, "__argos__");
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
  removeGlobalClass(document, "__argos__");
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
function waitForFontsToLoad(document: Document) {
  return document.fonts.status === "loaded";
}

/**
 * Wait for the images to be loaded.
 */
function waitForImagesToLoad(document: Document) {
  const images = Array.from(document.images);

  // Force eager loading
  images.forEach((img) => {
    // Force sync decoding
    if (img.decoding !== "sync") {
      img.decoding = "sync";
    }

    // Force eager loading
    if (img.loading !== "eager") {
      img.loading = "eager";
    }
  });

  return images.every((img) => img.complete);
}

/**
 * Wait for all [aria-busy="true"] elements to invisible.
 */
function waitForNoBusy(document: Document) {
  const checkIsVisible = (element: Element) => {
    // Basic check for HTMLElement
    if (
      element instanceof HTMLElement &&
      (element.offsetHeight !== 0 || element.offsetWidth !== 0)
    ) {
      return true;
    }
    // Check for HTMLElement & SVGElement
    return element.getClientRects().length > 0;
  };

  const elements = Array.from(document.querySelectorAll('[aria-busy="true"]'));
  return elements.every((element) => !checkIsVisible(element));
}

export type StabilizationOptions = {
  /**
   * Wait for [aria-busy="true"] elements to be invisible.
   * @default true
   */
  ariaBusy?: boolean;
  /**
   * Wait for images to be loaded.
   * @default true
   */
  images?: boolean;
  /**
   * Wait for fonts to be loaded.
   * @default true
   */
  fonts?: boolean;
};

/**
 * Get the stabilization state of the document.
 */
function getStabilityState(document: Document, options?: StabilizationOptions) {
  const { ariaBusy = true, images = true, fonts = true } = options ?? {};
  return {
    ariaBusy: ariaBusy ? waitForNoBusy(document) : true,
    images: images ? waitForImagesToLoad(document) : true,
    fonts: fonts ? waitForFontsToLoad(document) : true,
  };
}

const VALIDATION_ERRORS: Record<keyof StabilizationOptions, string> = {
  ariaBusy: "Some elements still have `aria-busy='true'`",
  images: "Some images are still loading",
  fonts: "Some fonts are still loading",
};

/**
 * Get the stability failure reasons.
 */
export function getStabilityFailureReasons(
  document: Document,
  options?: StabilizationOptions,
) {
  const stabilityState = getStabilityState(document, options);
  return Object.entries(stabilityState).reduce<string[]>(
    (reasons, [key, value]) => {
      if (!value) {
        reasons.push(VALIDATION_ERRORS[key as keyof typeof VALIDATION_ERRORS]);
      }
      return reasons;
    },
    [],
  );
}

/**
 * Check if the document is stable.
 */
export function checkIsStable(
  document: Document,
  options?: StabilizationOptions,
) {
  const stabilityState = getStabilityState(document, options);
  return Object.values(stabilityState).every(Boolean);
}
