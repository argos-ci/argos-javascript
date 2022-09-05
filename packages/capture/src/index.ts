import { resolve } from "node:path";
import puppeteer from "puppeteer";
import filenamifyUrl from "filenamify-url";
import mkdirp from "mkdirp";

interface CaptureClientOptions {
  outputDir: string;
}

class CaptureClient {
  outputDir: string;
  status: "stopped" | "stopping" | "started" | "starting";
  browser?: puppeteer.Browser;
  page?: puppeteer.Page;

  constructor({ outputDir }: CaptureClientOptions) {
    this.outputDir = outputDir;
    this.status = "stopped";
  }

  async start() {
    if (this.status !== "stopped") {
      throw new Error(`CaptureClient is ${this.status}`);
    }
    this.status = "starting";
    this.browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    this.status = "started";
  }

  async stop() {
    if (this.status !== "started") {
      throw new Error(`CaptureClient is ${this.status}`);
    }
    this.status = "stopping";
    await this.browser?.close();
    this.browser = undefined;
    this.page = undefined;
    this.status = "stopped";
  }

  async capture(url: string) {
    if (!this.page) {
      throw new Error("CaptureClient is not started");
    }
    // @ts-ignore
    await mkdirp(this.outputDir);
    await this.page.goto(url);
    const filename = `${filenamifyUrl(url)}.png`;
    await this.page.screenshot({
      type: "png",
      fullPage: true,
      path: resolve(this.outputDir, filename),
    });
  }
}

export type { CaptureClient };

export const createCaptureClient = (options: CaptureClientOptions) =>
  new CaptureClient(options);
