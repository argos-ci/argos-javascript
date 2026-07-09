import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

// Read more about streamline page screenshot captures
// https://argos-ci.com/docs/learn/how-to-guides/visual-coverage/capture-screenshots-from-urls

test("screenshot homepage", async ({ page }, workerInfo) => {
  const url = "https://playwright.dev/";
  await page.goto(url);

  const browserName = workerInfo.project.name;
  await argosScreenshot(page, `homepage-${browserName}`);
});
