import puppeteer from "puppeteer";
import { argosScreenshot } from "@argos-ci/puppeteer";

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto("https://example.com");
await argosScreenshot(page, "example");
await browser.close();
