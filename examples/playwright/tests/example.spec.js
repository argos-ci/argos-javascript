import { test } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

// Read more about capturing screenshots of multiple pages:
// https://argos-ci.com/docs/learn/how-to-guides/visual-coverage/capture-screenshots-from-urls

test("screenshot homepage", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  await argosScreenshot(page, "homepage");
});
