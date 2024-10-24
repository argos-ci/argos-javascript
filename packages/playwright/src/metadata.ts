import {
  ScreenshotMetadata,
  getGitRepositoryPath,
  readVersionFromPackage,
} from "@argos-ci/util";
import { TestInfo } from "@playwright/test";
import { TestCase, TestResult } from "@playwright/test/reporter";
import { relative } from "node:path";
import { createRequire } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";

const require = createRequire(import.meta.url);

/**
 * Try to resolve a package.
 */
function tryResolve(pkg: string) {
  try {
    return require.resolve(pkg);
  } catch {
    return null;
  }
}

type PlaywrightLibrary = "@playwright/test" | "playwright" | "playwright-core";

type MetadataConfig = {
  sdk: ScreenshotMetadata["sdk"];
  playwrightLibraries: PlaywrightLibrary[];
};

/**
 * Private metadata config storage.
 * Used to inject the metadata from other SDKs like @argos-ci/storybook.
 */
const metadataConfigStorage = new AsyncLocalStorage<MetadataConfig>();

/**
 * Set the metadata config.
 */
export async function setMetadataConfig(metadata: MetadataConfig) {
  metadataConfigStorage.enterWith(metadata);
}

const DEFAULT_PLAYWRIGHT_LIBRARIES: PlaywrightLibrary[] = [
  "@playwright/test",
  "playwright",
  "playwright-core",
];

/**
 * Get the name and version of the automation library.
 */
async function getAutomationLibraryMetadata(): Promise<
  ScreenshotMetadata["automationLibrary"]
> {
  const metadataConfig = metadataConfigStorage.getStore();
  const libraries =
    metadataConfig?.playwrightLibraries ?? DEFAULT_PLAYWRIGHT_LIBRARIES;
  for (const name of libraries) {
    const pkgPath = tryResolve(`${name}/package.json`);
    if (pkgPath) {
      const version = await readVersionFromPackage(pkgPath);
      return { version, name };
    }
  }
  throw new Error(
    `Unable to find any of the following packages: ${libraries.join(", ")}`,
  );
}

/**
 * Get the version of the Argos Playwright SDK.
 */
async function getArgosPlaywrightVersion(): Promise<string> {
  const pkgPath = require.resolve("@argos-ci/playwright/package.json");
  return readVersionFromPackage(pkgPath);
}

/**
 * Get the name and version of the SDK.
 */
async function getSdkMetadata(): Promise<ScreenshotMetadata["sdk"]> {
  // Get the SDK metadata from the async local storage.
  const metadataConfig = metadataConfigStorage.getStore();
  if (metadataConfig) {
    return metadataConfig.sdk;
  }

  // Get the SDK metadata from the current SDK.
  const argosPlaywrightVersion = await getArgosPlaywrightVersion();
  return {
    name: "@argos-ci/playwright",
    version: argosPlaywrightVersion,
  };
}

/**
 * Get the metadata of the automation library and the SDK.
 */
export async function getLibraryMetadata() {
  const [automationLibrary, sdk] = await Promise.all([
    getAutomationLibraryMetadata(),
    getSdkMetadata(),
  ]);

  return {
    automationLibrary,
    sdk,
  };
}

/**
 * Get the metadata of the test.
 */
export async function getTestMetadataFromTestInfo(testInfo: TestInfo) {
  const repositoryPath = await getGitRepositoryPath();
  const testMetadata: ScreenshotMetadata["test"] = {
    id: testInfo.testId,
    title: testInfo.title,
    titlePath: testInfo.titlePath,
    retry: testInfo.retry,
    retries: testInfo.project.retries,
    repeat: testInfo.repeatEachIndex,
    location: {
      file: repositoryPath
        ? relative(repositoryPath, testInfo.file)
        : testInfo.file,
      line: testInfo.line,
      column: testInfo.column,
    },
  };
  return testMetadata;
}

export async function getTestMetadataFromTestCase(
  testCase: TestCase,
  testResult: TestResult,
) {
  const repositoryPath = await getGitRepositoryPath();
  const testMetadata: ScreenshotMetadata["test"] = {
    title: testCase.title,
    titlePath: testCase.titlePath(),
    retry: testResult.retry,
    retries: testCase.retries,
    repeat: testCase.repeatEachIndex,
    location: {
      file: repositoryPath
        ? relative(repositoryPath, testCase.location.file)
        : testCase.location.file,
      line: testCase.location.line,
      column: testCase.location.column,
    },
  };
  return testMetadata;
}

export async function getMetadataFromTestCase(
  testCase: TestCase,
  testResult: TestResult,
) {
  const [libMetadata, testMetadata] = await Promise.all([
    getLibraryMetadata(),
    getTestMetadataFromTestCase(testCase, testResult),
  ]);

  const metadata: ScreenshotMetadata = {
    test: testMetadata,
    ...libMetadata,
  };

  return metadata;
}
