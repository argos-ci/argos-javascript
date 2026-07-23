<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Official Argos Puppeteer integration

[![npm version](https://img.shields.io/npm/v/@argos-ci/puppeteer.svg)](https://www.npmjs.com/package/@argos-ci/puppeteer)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/puppeteer.svg)](https://www.npmjs.com/package/@argos-ci/puppeteer)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/puppeteer.svg)](https://www.npmjs.com/package/@argos-ci/puppeteer)

Capture stable Argos screenshots from your [Puppeteer](https://github.com/puppeteer/puppeteer) tests.

Visit the [Puppeteer SDK documentation](https://argos-ci.com/docs/reference/puppeteer) for guides, the API reference, and more.

## Installation

Install the SDK alongside the [Argos CLI](https://argos-ci.com/docs/reference/argos-command-line-interface-cli), which uploads the screenshots to Argos:

```sh
npm install --save-dev @argos-ci/puppeteer @argos-ci/cli
```

## Usage

Use `argosScreenshot` to stabilize the UI and capture a screenshot:

```ts
import puppeteer from "puppeteer";
import { argosScreenshot } from "@argos-ci/puppeteer";

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3000");
await argosScreenshot(page, "homepage");
await browser.close();
```

Screenshots are saved locally (in `./screenshots/argos` by default). Upload them to Argos with the Argos CLI, usually at the end of your CI job:

```sh
npx @argos-ci/cli upload ./screenshots
```

## Links

- [Official SDK Docs](https://argos-ci.com/docs/reference/puppeteer)
- [Quickstart](https://argos-ci.com/docs/quickstart/puppeteer-quickstart)
- [Discord](https://argos-ci.com/discord)
