import type { TestRunnerConfig } from "@storybook/test-runner";
import { argosScreenshot } from "@argos-ci/storybook/test-runner";

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    await argosScreenshot(page, context);
  },
};

export default config;
