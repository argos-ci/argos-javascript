import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";

import type { Page, TestInfo, Locator, Frame } from "@playwright/test";
import {
  type ArgosGlobal,
  getGlobalScript,
  type StabilizationPluginOptions,
  type StabilizationContext,
} from "@argos-ci/browser";
import {
  getMetadataPath,
  type ScreenshotMetadata,
  writeMetadata,
} from "@argos-ci/util";
import { getAttachmentName, type ArgosAttachment } from "./attachment";
import {
  getLibraryMetadata,
  getMetadataOverrides,
  getTestMetadata,
} from "./metadata";
import { checkIsUsingArgosReporter } from "./util";

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
 * Inject Argos script into the document.
 */
async function injectArgos(handler: Handler) {
  const injected = await handler.evaluate(
    () => typeof (window as any).__ARGOS__ !== "undefined",
  );
  if (!injected) {
    await handler.addScriptTag({ content: getGlobalScript() });
  }
}

/**
 * Get test info from the Playwright test.
 */
async function getTestInfo() {
  try {
    const { test } = await import("@playwright/test");
    return test.info();
  } catch {
    return null;
  }
}

/**
 * Check if the handler is a Frame.
 */
function checkIsFrame(handler: Handler): handler is Frame {
  return "page" in handler && typeof handler.page === "function";
}

/**
 * Get the Playwright `Page` from the handler.
 * If the handler is a Frame, it returns the parent page.
 * Otherwise, it returns the handler itself.
 */
function getPage(handler: Handler): Page {
  if (checkIsFrame(handler)) {
    return handler.page();
  }
  return handler;
}

/**
 * Get the viewport size.
 */
function getViewportSize(page: Page) {
  const viewportSize = page.viewportSize();
  if (!viewportSize) {
    throw new Error("Can't take snapshots without a viewport.");
  }
  return viewportSize;
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

/**
 * Run before taking all screenshots.
 */
async function beforeAll(handler: Handler, options: ArgosSnapshotOptions) {
  const context = getStabilizationContext(options);
  await handler.evaluate(
    (context) => ((window as any).__ARGOS__ as ArgosGlobal).beforeAll(context),
    context,
  );
  return async () => {
    await handler.evaluate(() =>
      ((window as any).__ARGOS__ as ArgosGlobal).afterAll(),
    );
  };
}

/**
 * Run before taking each screenshot.
 */
async function beforeEach(handler: Handler, options: ArgosSnapshotOptions) {
  const context = getStabilizationContext(options);
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
async function waitForReadiness(
  handler: Handler,
  options: ArgosSnapshotOptions,
) {
  const context = getStabilizationContext(options);
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
 * Get the screenshot names based on the test info.
 */
function getScreenshotNames(name: string, testInfo: TestInfo | null) {
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

type Handler = Page | Frame;

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
  handler: Handler,
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

  const useArgosReporter = Boolean(
    testInfo && checkIsUsingArgosReporter(testInfo),
  );

  await Promise.all([
    // Create the root folder if it doesn't exist
    useArgosReporter ? null : mkdir(root, { recursive: true }),
    // Inject Argos script into the page
    injectArgos(handler),
  ]);

  const afterAll = await beforeAll(handler, options);

  const collectMetadata = async (
    testInfo: TestInfo | null,
  ): Promise<ScreenshotMetadata> => {
    const overrides = getMetadataOverrides();
    const [colorScheme, mediaType, libMetadata, testMetadata] =
      await Promise.all([
        handler.evaluate(() =>
          ((window as any).__ARGOS__ as ArgosGlobal).getColorScheme(),
        ),
        handler.evaluate(() =>
          ((window as any).__ARGOS__ as ArgosGlobal).getMediaType(),
        ),
        getLibraryMetadata(),
        getTestMetadata(testInfo),
      ]);

    const viewportSize = checkIsFrame(handler)
      ? null
      : getViewportSize(handler);

    const browser = getPage(handler).context().browser();
    if (!browser) {
      throw new Error("Can't take snapshots without a browser.");
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

    return metadata;
  };

  const names = getScreenshotNames(name, testInfo);

  const metadata = await collectMetadata(testInfo);
  metadata.transient = {};

  if (names.baseName) {
    metadata.transient.baseName = `${names.baseName}.yaml`;
  }

  const snapshotPath =
    useArgosReporter && testInfo
      ? testInfo.outputPath("argos", `${names.name}.yaml`)
      : resolve(root, `${names.name}.yaml`);

  const dir = dirname(snapshotPath);
  if (dir !== root) {
    await mkdir(dirname(snapshotPath), { recursive: true });
  }

  await waitForReadiness(handler, options);
  const afterEach = await beforeEach(handler, options);
  await waitForReadiness(handler, options);

  await Promise.all([
    snapshotTarget.ariaSnapshot({ timeout }).then((snapshot) => {
      return writeFile(snapshotPath, snapshot, "utf-8");
    }),
    writeMetadata(snapshotPath, metadata),
  ]);

  const attachments: ArgosAttachment[] = [
    {
      name: getAttachmentName(names.name, "snapshot"),
      contentType: "application/yaml",
      path: snapshotPath,
    },
    {
      name: getAttachmentName(names.name, "snapshot/metadata"),
      contentType: "application/json",
      path: getMetadataPath(snapshotPath),
    },
  ];

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

  await afterEach();
  await afterAll();

  return attachments;
}
