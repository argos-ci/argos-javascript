import { writeFile } from "node:fs/promises";

import type { Page, Locator, Frame } from "@playwright/test";
import {
  type StabilizationPluginOptions,
  type StabilizationContext,
} from "@argos-ci/browser";
import { getMetadataPath, writeMetadata } from "@argos-ci/util";
import { getAttachmentName, type ArgosAttachment } from "./attachment";
import {
  attachAttachments,
  beforeAll,
  beforeEach,
  checkIsUsingArgosReporter,
  getPathAndMetadata,
  getSnapshotNames,
  getTestInfo,
  prepare,
  waitForReadiness,
  ARIA_EXTENSION,
} from "./util";

const DEFAULT_SNAPSHOTS_ROOT = "./screenshots";

type LocatorOptions = Parameters<Page["locator"]>[1];

export type ArgosSnapshotOptions = {
  /**
   * `Locator` or string selector of the element to take a snapshot of.
   */
  element?: string | Locator;

  /**
   * Folder where the snapshots will be saved if not using the Argos reporter.
   * @default "./screenshots"
   */
  root?: string;

  /**
   * Wait for the UI to stabilize before taking the snapshot.
   * Set to `false` to disable stabilization.
   * Pass an object to customize the stabilization.
   * @default true
   */
  stabilize?: boolean | StabilizationPluginOptions;

  /**
   * Maximum time in milliseconds. Defaults to `0` - no timeout
   */
  timeout?: number;
} & LocatorOptions;

/**
 * Stabilize the UI and takes a snapshot of the application under test.
 *
 * @example
 *    argosAriaSnapshot(page, "my-screenshot")
 * @see https://playwright.dev/docs/aria-snapshots
 */
export async function argosAriaSnapshot(
  /**
   * Playwright `page` or `frame` object.
   */
  handler: Page | Frame,
  /**
   * Name of the snapshot. Must be unique.
   */
  name: string,
  /**
   * Options for the snapshot.
   */
  options: ArgosSnapshotOptions = {},
) {
  const {
    element,
    has,
    hasText,
    hasNot,
    hasNotText,
    timeout,
    root = DEFAULT_SNAPSHOTS_ROOT,
  } = options;

  if (!handler) {
    throw new Error("A Playwright `handler` object is required.");
  }

  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const snapshotTarget =
    typeof element === "string"
      ? handler.locator(element, { has, hasText, hasNot, hasNotText })
      : (element ?? handler.locator("body"));

  const testInfo = await getTestInfo();

  const useArgosReporter = checkIsUsingArgosReporter(testInfo);

  await prepare({ handler, useArgosReporter, root });

  const context = getStabilizationContext(options);
  const afterAll = await beforeAll(handler, context);
  const names = getSnapshotNames(name, testInfo);

  const { path: snapshotPath, metadata } = await getPathAndMetadata({
    handler,
    extension: ARIA_EXTENSION,
    names,
    root,
    testInfo,
    useArgosReporter,
  });

  await waitForReadiness(handler, context);
  const afterEach = await beforeEach(handler, context);
  await waitForReadiness(handler, context);

  await Promise.all([
    snapshotTarget.ariaSnapshot({ timeout }).then((snapshot) => {
      return writeFile(snapshotPath, snapshot, "utf-8");
    }),
    writeMetadata(snapshotPath, metadata),
  ]);

  const attachments: ArgosAttachment[] = [
    {
      name: getAttachmentName(names.name, "aria"),
      contentType: "application/yaml",
      path: snapshotPath,
    },
    {
      name: getAttachmentName(names.name, "aria/metadata"),
      contentType: "application/json",
      path: getMetadataPath(snapshotPath),
    },
  ];

  await attachAttachments({ attachments, testInfo, useArgosReporter });

  await afterEach();
  await afterAll();

  return attachments;
}

/**
 * Get the stabilization context from the options.
 */
function getStabilizationContext(
  options: ArgosSnapshotOptions,
): StabilizationContext {
  const { stabilize } = options;
  return {
    fullPage: false,
    argosCSS: undefined,
    viewports: undefined,
    options: stabilize,
  };
}
