import "cypress-wait-until";
import type { ArgosGlobal } from "@argos-ci/browser/global.js";
import { resolveViewport, ViewportOption } from "@argos-ci/browser";
import {
  getMetadataPath,
  getScreenshotName,
  ScreenshotMetadata,
} from "@argos-ci/util/browser";

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

function readArgosCypressVersion() {
  const fileName = require.resolve("@argos-ci/cypress/package.json");
  return cy.readFile(fileName).then((source) => {
    return source.version;
  });
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

      let ref: any = {};

      cy.wrap(subject).screenshot(name, {
        blackout: ['[data-visual-test="blackout"]'].concat(
          options.blackout || [],
        ),
        onAfterScreenshot: (_$el, props) => {
          ref.props = props;
        },
        ...options,
      });

      cy.window({ log: false }).then((window) => {
        const mediaType = (
          (window as any).__ARGOS__ as ArgosGlobal
        ).getMediaType();
        const colorScheme = (
          (window as any).__ARGOS__ as ArgosGlobal
        ).getColorScheme();

        readArgosCypressVersion().then((argosCypressVersion) => {
          const metadata: ScreenshotMetadata = {
            url: window.location.href,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
            colorScheme,
            mediaType,
            test: {
              title: Cypress.currentTest.title,
              titlePath: Cypress.currentTest.titlePath,
            },
            browser: {
              name: Cypress.browser.name,
              version: Cypress.browser.version,
            },
            automationLibrary: {
              name: "cypress",
              version: Cypress.version,
            },
            sdk: {
              name: "@argos-ci/cypress",
              version: argosCypressVersion,
            },
          };

          cy.writeFile(
            getMetadataPath(ref.props.path),
            JSON.stringify(metadata),
          );
        });
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
