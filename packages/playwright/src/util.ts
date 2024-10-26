import type { TestInfo } from "@playwright/test";
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
