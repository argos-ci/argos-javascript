import "cypress-wait-until";

const GLOBAL_STYLES = `
  /* Hide carets */
  * { caret-color: transparent !important; }

  /* Hide scrollbars */
  ::-webkit-scrollbar {
    display: none !important;
  }

  /* Generic hide */
  [data-visual-test="transparent"] {
    color: transparent !important;
    font-family: monospace !important;
    opacity: 0 !important;
  }

  [data-visual-test="removed"] {
    display: none !important;
  }

  [data-test-no-radius] {
    border-radius: 0 !important;
  }
`;

/**
 * Injected style to hide elements and fix unstable rendering.
 */
function injectStyles(document) {
  const css = document.createElement("style");
  css.type = "text/css";
  css.textContent = GLOBAL_STYLES;
  document.body.appendChild(css);
}

/**
 * Check if an element is visible.
 */
function isVisible(element) {
  return Boolean(
    element.offsetWidth ||
      element.offsetHeight ||
      element.getClientRects().length
  );
}

/**
 * Wait until there is no `[aria-busy="true"]` element on the page.
 */
function waitUntilNoBusy() {
  cy.waitUntil(() =>
    cy.document().then((document) => {
      const busy = Array.from(document.querySelectorAll('[aria-busy="true"]'));
      return busy.every((element) => !isVisible(element));
    })
  );
}

/**
 * Wait until all images are loaded.
 */
function waitForImagesLoading() {
  cy.waitUntil(() =>
    cy.document().then((document) => {
      const allImages = Array.from(document.images);
      allImages.forEach((img) => {
        img.loading = "eager";
        img.decoding = "sync";
      });
      return allImages.every((img) => img.complete && img.naturalWidth > 0);
    })
  );
}

/**
 *  Disable spellcheck on inputs, textareas, and contenteditable elements to avoid red underlines
 */
function disableSpellCheck() {
  cy.document().then((document) => {
    const query =
      "[contenteditable]:not([contenteditable=false]):not([spellcheck=false]), input:not([spellcheck=false]), textarea:not([spellcheck=false])";
    document.querySelectorAll(query).forEach((element) => {
      element.setAttribute("spellcheck", "false");
    });
  });
  return true;
}

Cypress.Commands.add(
  "argosScreenshot",
  { prevSubject: ["optional", "element", "window", "document"] },
  (subject, name, options = {}) => {
    if (typeof name === "object" && name !== null) {
      options = name;
      name = null;
    }

    Cypress.log({
      name: "argosScreenshot",
      displayName: `Argos Screenshot`,
      message: name,
    });

    // Inject styles
    cy.document().then((doc) => injectStyles(doc));

    // Wait until there is no `[aria-busy="true"]` element on the page.
    waitUntilNoBusy();

    // Wait for fonts to be loaded
    cy.document().its("fonts.status").should("equal", "loaded");

    // Wait for images to be loaded
    waitForImagesLoading();

    // Wait for images to be loaded
    disableSpellCheck();

    // Screenshot
    cy.wrap(subject).screenshot(name, {
      blackout: ['[data-visual-test="blackout"]'].concat(
        options.blackout || []
      ),
      ...options,
    });
  }
);
