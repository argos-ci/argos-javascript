import {
  ScreenshotMetadata,
  getGitRepositoryPath,
  readVersionFromPackage,
} from "@argos-ci/util";
import { TestInfo } from "@playwright/test";
import { TestCase } from "@playwright/test/reporter";
import { relative } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function getPlaywrightVersion(): Promise<string> {
  const pkgPath = require.resolve("playwright/package.json");
  return readVersionFromPackage(pkgPath);
}

async function getArgosPlaywrightVersion(): Promise<string> {
  const pkgPath = require.resolve("@argos-ci/playwright/package.json");
  return readVersionFromPackage(pkgPath);
}

export async function getLibraryMetadata() {
  const [playwrightVersion, argosPlaywrightVersion] = await Promise.all([
    getPlaywrightVersion(),
    getArgosPlaywrightVersion(),
  ]);

  const metadata = {
    automationLibrary: {
      name: "playwright",
      version: playwrightVersion,
    },
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

export async function getTestMetadataFromTestCase(testCase: TestCase) {
  const repositoryPath = await getGitRepositoryPath();
  const testMetadata: ScreenshotMetadata["test"] = {
    title: testCase.title,
    titlePath: testCase.titlePath(),
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

export async function getMetadataFromTestCase(testCase: TestCase) {
  const [libMetadata, testMetadata] = await Promise.all([
    getLibraryMetadata(),
    getTestMetadataFromTestCase(testCase),
  ]);

  const metadata: ScreenshotMetadata = {
    test: testMetadata,
    ...libMetadata,
  };

  return metadata;
}
