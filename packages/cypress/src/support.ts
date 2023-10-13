import "cypress-wait-until";
import type { ArgosGlobal } from "@argos-ci/browser/global.js";
import {
  getScreenshotName,
  resolveViewport,
  ViewportOption,
} from "@argos-ci/browser";

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
        options?: Partial<Loggable & Timeoutable & ScreenshotOptions> & {
          viewports?: ViewportOption[];
        },
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
  (subject, name, { viewports, ...options } = {}) => {
    if (!name) {
      throw new Error("The `name` argument is required.");
    }

    Cypress.log({
      name: "argosScreenshot",
      displayName: `Argos Screenshot`,
      message: name,
    });

    injectArgos();

    cy.window({ log: false }).then((window) =>
      ((window as any).__ARGOS__ as ArgosGlobal).prepareForScreenshot(),
    );

    function stabilizeAndScreenshot(name: string) {
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
    }

    if (!viewports) {
      stabilizeAndScreenshot(name);
      return;
    }

    for (const viewport of viewports) {
      const viewportSize = resolveViewport(viewport);
      cy.viewport(viewportSize.width, viewportSize.height);
      stabilizeAndScreenshot(
        getScreenshotName(name, { viewportWidth: viewportSize.width }),
      );
    }

    // Restore the original viewport
    cy.viewport(
      Cypress.config("viewportWidth"),
      Cypress.config("viewportHeight"),
    );
  },
);
