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
 * Options passed when calling `argosSnapshot`.
 *
 * `argosSnapshot` serializes any value to a file that Argos picks up and diffs,
 * mimicking {@link https://vitest.dev/guide/snapshot Vitest snapshots}. Unlike
 * `argosScreenshot`, it does not need a browser and works both in Vitest browser
 * tests and in plain Node tests.
 *
 * These options must be JSON-serializable so they can cross the Vitest
 * browser/node RPC boundary — the only exception is `serialize`, which is
 * applied on the test side *before* the value is sent to Node.
 */
export interface VitestSnapshotOptions {
  /**
   * Unique name of the snapshot.
   *
   * When omitted, Argos generates one automatically from the current test,
   * mimicking {@link https://vitest.dev/guide/snapshot Vitest's snapshot naming}
   * (`` `${test.fullName} ${count}` ``).
   */
  name?: string;

  /**
   * Folder where the snapshot is written.
   *
   * In Node tests this defaults to `"./screenshots"`. In browser tests it
   * defaults to the plugin `root` and can be overridden per call.
   * @default "./screenshots"
   */
  root?: string;

  /**
   * Extension of the snapshot file. It also determines how Argos renders and
   * diffs the snapshot (e.g. `.txt`, `.json`, `.yml`, `.html`, `.md`).
   * @default ".txt"
   */
  extension?: string;

  /**
   * Tag or array of tags to attach to the snapshot.
   */
  tag?: string | string[];

  /**
   * Custom serializer used when `content` is not already a string.
   * Defaults to `@vitest/pretty-format` (the serializer Vitest itself uses).
   */
  serialize?: (content: unknown) => string;
}

/**
 * Subset of {@link VitestSnapshotOptions} that can cross the Vitest
 * browser/node RPC boundary. Excludes `serialize` (applied before the value is
 * sent to Node) and `name` (resolved on the test side and passed to the Node
 * primitives as a separate argument).
 */
export type SerializableSnapshotOptions = Omit<
  VitestSnapshotOptions,
  "serialize" | "name"
>;

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
