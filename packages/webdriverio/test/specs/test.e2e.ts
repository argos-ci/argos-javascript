import { browser } from "@wdio/globals";
import { argosScreenshot } from "../../src/index.js";

const url = new URL("../../fixtures/dummy.html", import.meta.url).href;

it("take a simple screenshot of the page", async () => {
  await browser.url(url);
  await argosScreenshot(browser, "simple");
});

describe("mask option", () => {
  it("mask some area of the images", async () => {
    await browser.url(url);
    await argosScreenshot(browser, "masks", {
      mask: [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 100, y: 100, width: 100, height: 100 },
      ],
    });
  });
});

describe("with a name ending with `.png`", () => {
  it("allows to specify the full path", async () => {
    await browser.url(url);
    await argosScreenshot(browser, "screenshots/fullpath.png");
  });
});
