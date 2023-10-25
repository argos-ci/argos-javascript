import {
  ScreenshotMetadata,
  getGitRepositoryPath,
  readVersionFromPackage,
} from "@argos-ci/util";
import { TestInfo } from "@playwright/test";
import { TestCase, TestResult } from "@playwright/test/reporter";
import { relative } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const tryResolve = (pkg: string) => {
  try {
    return require.resolve(pkg);
  } catch {
    return null;
  }
};

async function getAutomationLibrary(): Promise<{
  version: string;
  name: string;
}> {
  const libraries = ["@playwright/test", "playwright", "playwright-core"];
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

async function getArgosPlaywrightVersion(): Promise<string> {
  const pkgPath = require.resolve("@argos-ci/playwright/package.json");
  return readVersionFromPackage(pkgPath);
}

export async function getLibraryMetadata() {
  const [automationLibrary, argosPlaywrightVersion] = await Promise.all([
    getAutomationLibrary(),
    getArgosPlaywrightVersion(),
  ]);

  const metadata = {
    automationLibrary,
    sdk: {
      name: "@argos-ci/playwright",
      version: argosPlaywrightVersion,
    },
  } satisfies Partial<ScreenshotMetadata>;

  return metadata;
}

export async function getTestMetadataFromTestInfo(testInfo: TestInfo) {
  const repositoryPath = await getGitRepositoryPath();
  const testMetadata: ScreenshotMetadata["test"] = {
    id: testInfo.testId,
    title: testInfo.title,
    titlePath: testInfo.titlePath,
    retry: testInfo.retry,
    retries: testInfo.project.retries,
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
