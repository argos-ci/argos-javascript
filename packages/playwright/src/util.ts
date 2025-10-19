import type { ElementHandle, Frame, Page, TestInfo } from "@playwright/test";
import type { TestCase, TestResult } from "@playwright/test/reporter";
import { createRequire } from "node:module";
import {
  getLibraryMetadata,
  getMetadataOverrides,
  getTestMetadata,
} from "./metadata";
import {
  getGlobalScript,
  type ArgosGlobal,
  type StabilizationContext,
  type ViewportSize,
} from "@argos-ci/browser";
import type { ScreenshotMetadata } from "@argos-ci/util";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import type { ArgosAttachment } from "./attachment";

const require = createRequire(import.meta.url);

/**
 * Check if the project is using the Argos reporter.
 */
export function checkIsUsingArgosReporter(testInfo: TestInfo | null): boolean {
  if (!testInfo) {
    return false;
  }
  const reporterPath = require.resolve("@argos-ci/playwright/reporter");
  return testInfo.config.reporter.some(
    (reporter) =>
      reporter[0].includes("@argos-ci/playwright/reporter") ||
      reporter[0] === reporterPath,
  );
}

export const PNG_EXTENSION = `.png`;
export const ARIA_EXTENSION = `.aria.yml`;
export const METADATA_EXTENSION = `.argos.json`;

/**
 * Maximum length for a screenshot name.
 */
const MAX_NAME_LENGTH = 255 - PNG_EXTENSION.length - METADATA_EXTENSION.length;

/**
 * Truncate a text to a length and add `...`
 */
function truncate(text: string, length: number) {
  if (text.length <= length) {
    return text;
  }
  return text.slice(0, length - 1) + "…";
}

/**
 * Get the automatic screenshot name.
 */
export function getAutomaticScreenshotName(test: TestCase, result: TestResult) {
  const name = test.titlePath().join(" ");
  let suffix = "";
  suffix += result.retry > 0 ? ` #${result.retry + 1}` : "";
  suffix +=
    result.status === "failed" || result.status === "timedOut"
      ? " (failed)"
      : "";
  const maxNameLength = MAX_NAME_LENGTH - suffix.length;

  // If name is too long, use the id instead to have unique names.
  if (name.length > maxNameLength) {
    return `${truncate(`${test.id} - ${test.title}`, maxNameLength)}${suffix}`;
  }

  // Else we use the basic name.
  return `${name}${suffix}`;
}

/**
 * Get test info from the Playwright test.
 */
export async function getTestInfo() {
  try {
    const { test } = await import("@playwright/test");
    return test.info();
  } catch {
    return null;
  }
}

/**
 * Check if the value is a Page.
 */
export function checkIsPage(value: unknown): value is Page {
  return Boolean(
    value &&
      typeof value === "object" &&
      "bringToFront" in value &&
      typeof value.bringToFront === "function",
  );
}

/**
 * Check if the value is an element handle.
 */
export function checkIsElementHandle(value: unknown): value is ElementHandle {
  return Boolean(
    value &&
      typeof value === "object" &&
      "asElement" in value &&
      typeof value.asElement === "function",
  );
}

/**
 * Check if the handler is a Frame.
 */
export function checkIsFrame(handler: Page | Frame): handler is Frame {
  return "page" in handler && typeof handler.page === "function";
}

/**
 * Get the Playwright `Page` from the handler.
 * If the handler is a Frame, it returns the parent page.
 * Otherwise, it returns the handler itself.
 */
export function getPage(handler: Page | Frame): Page {
  if (checkIsFrame(handler)) {
    return handler.page();
  }
  return handler;
}

/**
 * Get the viewport size.
 */
export function getViewportSize(page: Page) {
  const viewportSize = page.viewportSize();
  if (!viewportSize) {
    throw new Error("Snapshots can't be taken without a viewport.");
  }
  return viewportSize;
}

type SnapshotNames = {
  name: string;
  baseName: string | null;
};

/**
 * Sets the viewport size and waits for the visual viewport to match the specified dimensions.
 * @returns A promise that resolves when the viewport size has been successfully set and matched.
 */
export async function setViewportSize(page: Page, viewportSize: ViewportSize) {
  await page.setViewportSize(viewportSize);
  await page.waitForFunction(
    ({ width, height }) =>
      window.innerWidth === width && window.innerHeight === height,
    { width: viewportSize.width, height: viewportSize.height },
  );
}

/**
 * Get the snapshot names based on the test info.
 */
export function getSnapshotNames(
  name: string,
  testInfo: TestInfo | null,
): SnapshotNames {
  if (testInfo) {
    const projectName = `${testInfo.project.name}/${name}`;

    if (testInfo.repeatEachIndex > 0) {
      return {
        name: `${projectName} repeat-${testInfo.repeatEachIndex}`,
        baseName: projectName,
      };
    }

    return { name: projectName, baseName: null };
  }

  return { name, baseName: null };
}

/**
 * Inject Argos script into the document.
 */
async function injectArgos(handler: Page | Frame) {
  const injected = await handler.evaluate(
    () => typeof (window as any).__ARGOS__ !== "undefined",
  );
  if (!injected) {
    await handler.addScriptTag({ content: getGlobalScript() });
  }
}

/**
 * Prepare Argos screenshot by injecting the SDK and creating the root directory.
 */
export async function prepare(args: {
  handler: Page | Frame;
  useArgosReporter: boolean;
  root: string;
}) {
  const { handler, useArgosReporter, root } = args;
  await Promise.all([
    // Create the screenshot folder if it doesn't exist
    useArgosReporter ? null : mkdir(root, { recursive: true }),
    // Inject Argos script into the page
    injectArgos(handler),
  ]);
}

type ScreenshotMetadataWithBaseName = ScreenshotMetadata & {
  transient: Partial<NonNullable<ScreenshotMetadata["transient"]>> & {
    baseName: string;
  };
};

/**
 * Get metadata and path.
 */
export async function getPathAndMetadata(args: {
  handler: Page | Frame;
  testInfo: TestInfo | null;
  names: SnapshotNames;
  extension: string;
  root: string;
  useArgosReporter: boolean;
}): Promise<{
  metadata: ScreenshotMetadataWithBaseName;
  path: string;
}> {
  const { handler, testInfo, names, extension, root, useArgosReporter } = args;
  const overrides = getMetadataOverrides();

  const path =
    useArgosReporter && testInfo
      ? testInfo.outputPath("argos", `${names.name}${extension}`)
      : resolve(root, `${names.name}${extension}`);

  const dir = dirname(path);

  const [colorScheme, mediaType, libMetadata, testMetadata] = await Promise.all(
    [
      handler.evaluate(() =>
        ((window as any).__ARGOS__ as ArgosGlobal).getColorScheme(),
      ),
      handler.evaluate(() =>
        ((window as any).__ARGOS__ as ArgosGlobal).getMediaType(),
      ),
      getLibraryMetadata(),
      getTestMetadata(testInfo),
      dir !== root ? mkdir(dir, { recursive: true }) : null,
    ],
  );

  const viewportSize = checkIsFrame(handler) ? null : getViewportSize(handler);

  const browser = getPage(handler).context().browser();
  if (!browser) {
    throw new Error("Can't take screenshots without a browser.");
  }
  const browserName = browser.browserType().name();
  const browserVersion = browser.version();
  const url = overrides?.url ?? handler.url();

  const metadata: ScreenshotMetadata = {
    url,
    colorScheme,
    mediaType,
    test: testMetadata,
    browser: {
      name: browserName,
      version: browserVersion,
    },
    ...libMetadata,
  };

  const viewport = viewportSize ?? getMetadataOverrides()?.viewport;

  if (viewport) {
    metadata.viewport = viewport;
  }

  metadata.transient = {};

  if (names.baseName) {
    metadata.transient.baseName = `${names.baseName}${extension}`;
  }

  return {
    metadata: metadata as ScreenshotMetadataWithBaseName,
    path,
  };
}

/**
 * Convert a screenshot to a snapshot path
 */
export function screenshotToSnapshotPath(value: string) {
  return value.replace(/\.png$/, ARIA_EXTENSION);
}

/**
 * Run before taking all screenshots.
 */
export async function beforeAll(
  handler: Page | Frame,
  context: StabilizationContext,
  options?: {
    disableHover?: boolean;
  },
) {
  await handler.evaluate(
    (context) => ((window as any).__ARGOS__ as ArgosGlobal).beforeAll(context),
    context,
  );
  if (options?.disableHover) {
    await getPage(handler).mouse.move(0, 0);
  }
  return async () => {
    await handler.evaluate(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterAll(),
    );
  };
}

/**
 * Run before taking each screenshot.
 */
export async function beforeEach(
  handler: Page | Frame,
  context: StabilizationContext,
) {
  await handler.evaluate(
    (context) => ((window as any).__ARGOS__ as ArgosGlobal).beforeEach(context),
    context,
  );
  return async () => {
    await handler.evaluate(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterEach(),
    );
  };
}

/**
 * Increase the timeout for the test x3.
 * Returns a function to reset the timeout.
 */
async function increaseTimeout() {
  const testInfo = await getTestInfo();
  if (testInfo) {
    const { timeout } = testInfo;
    // Like in "slow" mode but we don't use it because we want to
    // be able to reset it.
    testInfo.setTimeout(timeout * 3);
    return {
      value: timeout,
      reset: () => {
        testInfo.setTimeout(timeout);
      },
    };
  }
  return null;
}

/**
 * Wait for the UI to be ready before taking the screenshot.
 */
export async function waitForReadiness(
  handler: Page | Frame,
  context: StabilizationContext,
) {
  // We increase the timeout, so we will be able to get reasons
  // if the stabilization fails.
  const timeout = await increaseTimeout();

  try {
    await handler.waitForFunction(
      (context) => {
        const argos = (window as any).__ARGOS__ as ArgosGlobal;
        return argos.waitFor(context);
      },
      context,
      timeout ? { timeout: timeout.value } : undefined,
    );
    timeout?.reset();
  } catch (error) {
    const reasons = await handler.evaluate(
      (context) =>
        ((window as any).__ARGOS__ as ArgosGlobal).getWaitFailureExplanations(
          context,
        ),
      context,
    );
    throw new Error(
      `
Failed to stabilize screenshot, found the following issues:
${reasons.map((reason) => `- ${reason}`).join("\n")}
        `.trim(),
      { cause: error },
    );
  }
}

/**
 * Attach attachments to test info if necessary.
 */
export async function attachAttachments(args: {
  attachments: ArgosAttachment[];
  useArgosReporter: boolean;
  testInfo: TestInfo | null;
}) {
  const { attachments, useArgosReporter, testInfo } = args;
  if (useArgosReporter && testInfo) {
    await Promise.all(
      attachments.map((attachment) =>
        testInfo.attach(attachment.name, {
          path: attachment.path,
          contentType: attachment.contentType,
        }),
      ),
    );
  }
}
