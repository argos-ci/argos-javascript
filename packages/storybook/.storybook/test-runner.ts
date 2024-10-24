import { type TestRunnerConfig } from "@storybook/test-runner";
import { argosScreenshot } from "../dist/index.cjs";

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    await argosScreenshot(page, context);
  },
};

export default config;
