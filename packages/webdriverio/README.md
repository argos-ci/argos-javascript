<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Official Argos WebdriverIO integration

[![npm version](https://img.shields.io/npm/v/@argos-ci/webdriverio.svg)](https://www.npmjs.com/package/@argos-ci/webdriverio)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/webdriverio.svg)](https://www.npmjs.com/package/@argos-ci/webdriverio)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/webdriverio.svg)](https://www.npmjs.com/package/@argos-ci/webdriverio)

Capture stable Argos screenshots from your [WebdriverIO](https://webdriver.io) tests.

Visit the [WebdriverIO SDK documentation](https://argos-ci.com/docs/reference/webdriverio) for guides, the API reference, and more.

## Installation

Install the SDK alongside the [Argos CLI](https://argos-ci.com/docs/reference/argos-command-line-interface-cli), which uploads the screenshots to Argos:

```sh
npm install --save-dev @argos-ci/webdriverio @argos-ci/cli
```

## Usage

Use `argosScreenshot` to stabilize the UI and capture a screenshot:

```ts
import { argosScreenshot } from "@argos-ci/webdriverio";

describe("Homepage", () => {
  it("takes a screenshot", async () => {
    await browser.url("http://localhost:3000");
    await argosScreenshot(browser, "homepage");
  });
});
```

Screenshots are saved locally (in `./screenshots/argos` by default). Upload them to Argos with the Argos CLI, usually at the end of your CI job:

```sh
npx @argos-ci/cli upload ./screenshots
```

## Links

- [Official SDK Docs](https://argos-ci.com/docs/reference/webdriverio)
- [Quickstart](https://argos-ci.com/docs/quickstart/webdriverio-quickstart)
- [Discord](https://argos-ci.com/discord)
