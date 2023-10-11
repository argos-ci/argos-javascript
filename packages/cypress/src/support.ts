import "cypress-wait-until";
import type { ArgosGlobal } from "@argos-ci/browser/global.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Stabilize the UI and takes a screenshot of the application under test.
       *
       * @see https://on.cypress.io/screenshot
       * @example
       *    cy.argosScreenshot("my-screenshot")
       *    cy.get(".post").argosScreenshot()
       */
      argosScreenshot: (
        name: string,
        options?: Partial<Loggable & Timeoutable & ScreenshotOptions>,
      ) => Chainable<null>;
    }
  }
}

function injectArgos() {
  const fileName =
    typeof require?.resolve === "function"
      ? require.resolve("@argos-ci/browser/global.js")
      : "node_modules/@argos-ci/browser/dist/global.js";
  cy.readFile<string>(fileName).then((source) =>
    cy.window({ log: false }).then((window) => {
      window.eval(source);
    }),
  );
}

Cypress.Commands.add(
  "argosScreenshot",
  { prevSubject: ["optional", "element", "window", "document"] },
  (subject, name, options = {}) => {
    Cypress.log({
      name: "argosScreenshot",
      displayName: `Argos Screenshot`,
      message: name,
    });

    injectArgos();

    cy.window({ log: false }).then((window) =>
      ((window as any).__ARGOS__ as ArgosGlobal).prepareForScreenshot(),
    );

    cy.waitUntil(() =>
      cy
        .window({ log: false })
        .then((window) =>
          ((window as any).__ARGOS__ as ArgosGlobal).waitForStability(),
        ),
    );

    cy.wrap(subject).screenshot(name, {
      blackout: ['[data-visual-test="blackout"]'].concat(
        options.blackout || [],
      ),
      ...options,
    });
  },
);
