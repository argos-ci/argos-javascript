import "cypress-wait-until";
import {
  ArgosGlobal,
  resolveViewport,
  type ViewportOption,
} from "@argos-ci/browser";
import { getGlobalScript } from "@argos-ci/browser";
import {
  getMetadataPath,
  getScreenshotName,
  ScreenshotMetadata,
  validateThreshold,
} from "@argos-ci/util/browser";
// @ts-ignore
import { version } from "../package.json";

type ArgosScreenshotOptions = Partial<
  Cypress.Loggable & Cypress.Timeoutable & Cypress.ScreenshotOptions
> & {
  /**
   * Viewports to take screenshots of.
   */
  viewports?: ViewportOption[];
  /**
   * Custom CSS evaluated during the screenshot process.
   */
  argosCSS?: string;
  /**
   * Sensitivity threshold between 0 and 1.
   * The higher the threshold, the less sensitive the diff will be.
   * @default 0.5
   */
  threshold?: number;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Stabilize the UI and takes a screenshot of the application under test.
       *
       * @see https://argos-ci.com/docs/cypress#api-overview
       * @example
       *    cy.argosScreenshot("my-screenshot")
       *    cy.get(".post").argosScreenshot()
       */
      argosScreenshot: (
        /**
         * Name of the screenshot. Must be unique.
         */
        name: string,
        /**
         * Options for the screenshot.
         */
        options?: ArgosScreenshotOptions,
      ) => Chainable<null>;
    }
  }
}

function injectArgos() {
  cy.window({ log: false }).then((window) => {
    if (typeof (window as any).__ARGOS__ !== "undefined") return;
    window.eval(getGlobalScript());
  });
}

function setup(options: ArgosScreenshotOptions) {
  const { argosCSS } = options;
  const fullPage = !options.capture || options.capture === "fullPage";

  cy.window({ log: false }).then((window) =>
    ((window as any).__ARGOS__ as ArgosGlobal).setup({ fullPage, argosCSS }),
  );

  return () => {
    cy.window({ log: false }).then((window) =>
      ((window as any).__ARGOS__ as ArgosGlobal).teardown({
        fullPage,
        argosCSS,
      }),
    );
  };
}

Cypress.Commands.add(
  "argosScreenshot",
  { prevSubject: ["optional", "element", "window", "document"] },
  (subject, name, options = {}) => {
    const { viewports, argosCSS, ...cypressOptions } = options;
    if (!name) {
      throw new Error("The `name` argument is required.");
    }

    Cypress.log({
      name: "argosScreenshot",
      displayName: `Argos Screenshot`,
      message: name,
    });

    injectArgos();

    const teardown = setup(options);

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
        ...cypressOptions,
      });

      cy.window({ log: false }).then((window) => {
        const mediaType = (
          (window as any).__ARGOS__ as ArgosGlobal
        ).getMediaType();
        const colorScheme = (
          (window as any).__ARGOS__ as ArgosGlobal
        ).getColorScheme();

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
            retry: Cypress.currentRetry,
            // @ts-ignore
            retries: cy.state("runnable")._retries,
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
            version,
          },
        };

        metadata.transient = {};

        if (options.threshold !== undefined) {
          validateThreshold(options.threshold);
          metadata.transient.threshold = options.threshold;
        }

        cy.writeFile(getMetadataPath(ref.props.path), JSON.stringify(metadata));
      });
    }

    if (viewports) {
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
    } else {
      stabilizeAndScreenshot(name);
    }

    teardown();
  },
);
