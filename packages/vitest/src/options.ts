import type { UploadParameters } from "@argos-ci/core";
import type { ArgosScreenshotOptions as PlaywrightScreenshotOptions } from "@argos-ci/playwright";
import type {
  ViewportOption,
  StabilizationPluginOptions,
} from "@argos-ci/browser";

/**
 * Configuration for the Argos Vitest reporter.
 * @see https://js-sdk-reference.argos-ci.com/interfaces/UploadParameters.html
 */
export type ArgosReporterConfig = UploadParameters;

/**
 * Options passed when calling `argosScreenshot` from a browser test.
 *
 * These options cross the Vitest browser/node RPC boundary, so they must be
 * JSON-serializable. Non-serializable options (`beforeScreenshot`,
 * `afterScreenshot`, a `Locator`/`ElementHandle` `element`, …) can only be set
 * on the plugin via {@link ArgosVitestPluginOptions}.
 */
export interface VitestScreenshotOptions {
  /**
   * String selector of the element to take a screenshot of.
   * A `Locator`/`ElementHandle` cannot be used here because it can't be
   * serialized across the browser/node boundary — set it on the plugin instead.
   */
  element?: string;

  /**
   * Viewports to take screenshots of.
   * Implemented by resizing the Vitest iframe (Playwright's native `viewports`
   * option does not work on a frame).
   */
  viewports?: ViewportOption[];

  /**
   * Capture the full page instead of fitting the screenshot to the content.
   * - `false` (default): the iframe grows to fit the content in both
   *   dimensions, so nothing is clipped.
   * - `true`: keep the viewport width and grow the height (Playwright-style
   *   full page).
   * @default false
   */
  fullPage?: boolean;

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
   * Tag or array of tags to attach to the screenshot.
   */
  tag?: string | string[];

  /**
   * Capture an ARIA snapshot along with the screenshot.
   * @default false
   */
  ariaSnapshot?: boolean;

  /**
   * Disable hover effects by moving the mouse to the top-left corner.
   * @default true
   */
  disableHover?: boolean;

  /**
   * Wait for the UI to stabilize before taking the screenshot.
   * Set to `false` to disable stabilization or pass an object to customize it.
   * @default true
   */
  stabilize?: boolean | StabilizationPluginOptions;
}

/**
 * Options for the Argos Vitest plugin.
 *
 * Accepts every option supported by the Playwright `argosScreenshot` function
 * (including non-serializable ones like `beforeScreenshot`), all Argos upload
 * parameters, plus the plugin-specific options below. These act as defaults for
 * every screenshot and can be overridden per call with the serializable
 * {@link VitestScreenshotOptions}.
 */
export interface ArgosVitestPluginOptions
  extends ArgosReporterConfig, PlaywrightScreenshotOptions {
  /**
   * Upload the report to Argos at the end of the run.
   * @default false
   */
  uploadToArgos?: boolean;
}
