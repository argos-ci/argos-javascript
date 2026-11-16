import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

test("screenshot homepage", async ({ page }) => {
  await page.goto("/");
  await argosScreenshot(page, "homepage");
});
