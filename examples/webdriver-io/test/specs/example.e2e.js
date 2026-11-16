import { browser } from "@wdio/globals";
import { argosScreenshot } from "@argos-ci/webdriverio";

// Welcome to the Argos WebdriverIO example!
//
// `argosScreenshot` from the @argos-ci/webdriverio package
// saves the screenshot in the `./screenshots/argos` folder.

describe("Homepage", () => {
  it("takes a screenshot", async () => {
    await browser.url("https://webdriver.io/");
    await argosScreenshot(browser, "homepage");
  });
});
