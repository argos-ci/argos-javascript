import "cypress-wait-until";
import {
  type ArgosGlobal,
  resolveViewport,
  type StabilizationContext,
  type StabilizationPluginOptions,
  type ViewportOption,
} from "@argos-ci/browser";
import { getGlobalScript } from "@argos-ci/browser";
import {
  getMetadataPath,
  getScreenshotName,
  normalizeBaseNames,
  type ScreenshotMetadata,
  validateThreshold,
} from "@argos-ci/util/browser";
import { version } from "../package.json";
import { NAME_PREFIX } from "./shared";

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

  /**
   * Name, or list of names, to compare this screenshot against instead of its
   * own name. A list is tried in order and the first name found in the baseline
   * build wins, which lets a brand new screenshot fall back to an existing one
   * rather than showing up as added.
   *
   * The screenshot's own name is not implicitly included: list it first to keep
   * comparing against itself when it exists.
   *
   * @example
   *    // Compare "home-variant-b" against itself, or against "home" if it is new.
   *    cy.argosScreenshot("home-variant-b", {
   *      baseName: ["home-variant-b", "home"],
   *    })
   */
  baseName?: string | string[];

  /**
   * Wait for the UI to stabilize before taking the screenshot.
   * Set to `false` to disable stabilization.
   * Pass an object to customize the stabilization.
   * @default true
   */
  stabilize?: boolean | StabilizationPluginOptions;

  /**
   * Tag or array of tags to attach to the screenshot.
   */
  tag?: string | string[];
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Stabilize the UI and takes a screenshot of the application under test.
       *
       * @see https://argos-ci.com/docs/reference/cypress
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
    if (typeof (window as any).__ARGOS__ !== "undefined") {
      return;
    }
    window.eval(getGlobalScript());
  });
}

/**
 * Get the stabilization context from the options.
 */
function getStabilizationContext(
  options: ArgosScreenshotOptions,
): StabilizationContext {
  const { argosCSS, viewports } = options;
  const fullPage = !options.capture || options.capture === "fullPage";

  return {
    fullPage,
    argosCSS,
    viewports,
    options: options.stabilize,
  };
}

/**
 * Run before taking all screenshots.
 */
function beforeAll(options: ArgosScreenshotOptions) {
  const context = getStabilizationContext(options);

  cy.window({ log: false }).then((window) =>
    ((window as any).__ARGOS__ as ArgosGlobal).beforeAll(context),
  );

  return () => {
    cy.window({ log: false }).then((window) =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterAll(),
    );
  };
}

/**
 * Run before taking each screenshot.
 */
function beforeEach(options: ArgosScreenshotOptions) {
  const context = getStabilizationContext(options);

  cy.window({ log: false }).then((window) =>
    ((window as any).__ARGOS__ as ArgosGlobal).beforeEach(context),
  );

  return () => {
    cy.window({ log: false }).then((window) =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterEach(),
    );
  };
}

function getRetries(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const retries = Math.floor(value);
  return retries < 0 ? 0 : retries;
}

/**
 * Wait for the UI to be ready before taking the screenshot.
 */
function waitForReadiness(options: ArgosScreenshotOptions) {
  const context = getStabilizationContext(options);

  cy.waitUntil(() =>
    cy.window({ log: false }).then((window) => {
      const isStable = ((window as any).__ARGOS__ as ArgosGlobal).waitFor(
        context,
      );

      if (isStable) {
        return true;
      }

      const failureReasons = (
        (window as any).__ARGOS__ as ArgosGlobal
      ).getWaitFailureExplanations(context);

      failureReasons.forEach((reason) => {
        cy.log(`[argos] stability: ${reason}`);
      });

      return false;
    }),
  );
}

Cypress.Commands.add(
  "argosScreenshot",
  { prevSubject: ["optional", "element", "window", "document"] },
  (subject, name, options = {}) => {
    const {
      viewports,
      argosCSS: _argosCSS,
      tag,
      baseName,
      ...cypressOptions
    } = options;

    const baseNames = normalizeBaseNames(baseName);
    if (!name) {
      throw new Error("The `name` argument is required.");
    }

    Cypress.log({
      name: "argosScreenshot",
      displayName: `Argos Screenshot`,
      message: name,
    });

    injectArgos();

    const afterAll = beforeAll(options);

    function stabilizeAndScreenshot(name: string, baseNames: string[] | null) {
      waitForReadiness(options);
      const afterEach = beforeEach(options);
      waitForReadiness(options);

      const ref: any = {};

      cy.wrap(subject).screenshot(`${NAME_PREFIX}${name}`, {
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
            // @ts-expect-error - private property
            retries: getRetries(cy.state("runnable")._retries),
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

        if (baseNames) {
          metadata.transient.baseName = baseNames;
        }

        if (tag) {
          metadata.tags = Array.isArray(tag) ? tag : [tag];
        }

        if (options.threshold !== undefined) {
          validateThreshold(options.threshold);
          metadata.transient.threshold = options.threshold;
        }

        cy.writeFile(getMetadataPath(ref.props.path), JSON.stringify(metadata));
      });

      afterEach();
    }

    if (viewports) {
      for (const viewport of viewports) {
        const viewportSize = resolveViewport(viewport);
        cy.viewport(viewportSize.width, viewportSize.height);
        // The viewport suffix is part of the name, so the baselines need it too.
        stabilizeAndScreenshot(
          getScreenshotName(name, { viewportWidth: viewportSize.width }),
          baseNames?.map((baseName) =>
            getScreenshotName(baseName, { viewportWidth: viewportSize.width }),
          ) ?? null,
        );
      }

      // Restore the original viewport
      cy.viewport(
        Cypress.config("viewportWidth"),
        Cypress.config("viewportHeight"),
      );
    } else {
      stabilizeAndScreenshot(name, baseNames);
    }

    afterAll();
  },
);
