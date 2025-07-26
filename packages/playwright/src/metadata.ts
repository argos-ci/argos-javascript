import {
  getGitRepositoryPath,
  readVersionFromPackage,
  type ScreenshotMetadata,
} from "@argos-ci/util";
import type { TestInfo } from "@playwright/test";
import type { TestCase, TestResult } from "@playwright/test/reporter";
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

export type MetadataConfig = {
  sdk: ScreenshotMetadata["sdk"];
  playwrightLibraries: string[];
  url?: string;
  test?: ScreenshotMetadata["test"];
  viewport?: ScreenshotMetadata["viewport"];
};

/**
 * Private metadata config storage.
 * Used to inject the metadata from other SDKs like @argos-ci/storybook.
 */
const metadataConfigStorage = new AsyncLocalStorage<MetadataConfig>();

/**
 * Set the metadata config.
 */
export function setMetadataConfig(metadata: MetadataConfig) {
  metadataConfigStorage.enterWith(metadata);
}

const DEFAULT_PLAYWRIGHT_LIBRARIES = [
  "@playwright/test",
  "playwright",
  "playwright-core",
];

/**
 * Get the metadata overrides set by the SDK.
 */
export function getMetadataOverrides() {
  return metadataConfigStorage.getStore();
}

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
 * Resolve the test file path relative to the repository path.
 * If the repository path is not set, it returns the absolute path.
 */
function resolveTestFilePath(filepath: string, repositoryPath: string | null) {
  if (!repositoryPath) {
    return filepath;
  }
  return relative(repositoryPath, filepath);
}

/**
 * Get the metadata of the test.
 */
export async function getTestMetadata(
  testInfo: TestInfo | null,
): Promise<ScreenshotMetadata["test"]> {
  const repositoryPath = await getGitRepositoryPath();

  const metadataConfig = metadataConfigStorage.getStore();

  if (metadataConfig?.test) {
    return {
      ...metadataConfig.test,
      location: metadataConfig.test?.location
        ? {
            file: resolveTestFilePath(
              metadataConfig.test.location.file,
              repositoryPath,
            ),
            line: metadataConfig.test.location.line,
            column: metadataConfig.test.location.column,
          }
        : undefined,
    };
  }

  if (!testInfo) {
    return null;
  }

  const testMetadata: ScreenshotMetadata["test"] = {
    id: testInfo.testId,
    title: testInfo.title,
    titlePath: testInfo.titlePath,
    retry: testInfo.retry,
    retries: testInfo.project.retries,
    repeat: testInfo.repeatEachIndex,
    location: {
      file: resolveTestFilePath(testInfo.file, repositoryPath),
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
