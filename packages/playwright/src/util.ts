import type { TestInfo } from "@playwright/test";
import type { TestCase, TestResult } from "@playwright/test/reporter";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function checkIsUsingArgosReporter(testInfo: TestInfo) {
  const reporterPath = require.resolve("@argos-ci/playwright/reporter");
  return testInfo.config.reporter.some(
    (reporter) =>
      reporter[0].includes("@argos-ci/playwright/reporter") ||
      reporter[0] === reporterPath,
  );
}

export const PNG_EXTENSION = `.png`;

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
