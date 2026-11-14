# Snapvisor WebdriverIO integration

[![npm version](https://img.shields.io/npm/v/@snapvisor/webdriverio.svg)](https://www.npmjs.com/package/@snapvisor/webdriverio)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/webdriverio.svg)](https://www.npmjs.com/package/@snapvisor/webdriverio)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/webdriverio.svg)](https://www.npmjs.com/package/@snapvisor/webdriverio)

Capture stable Snapvisor screenshots from your [WebdriverIO](https://webdriver.io) tests.

Visit the [WebdriverIO SDK documentation](https://snapvisor.io/docs/sdks) for guides, the API reference, and more.

## Installation

Install the SDK alongside the [Snapvisor CLI](https://snapvisor.io/docs/sdks), which uploads the screenshots to Snapvisor:

```sh
npm install --save-dev @snapvisor/webdriverio @snapvisor/cli
```

## Usage

Use `argosScreenshot` to stabilize the UI and capture a screenshot:

```ts
import { argosScreenshot } from "@snapvisor/webdriverio";

describe("Homepage", () => {
  it("takes a screenshot", async () => {
    await browser.url("http://localhost:3000");
    await argosScreenshot(browser, "homepage");
  });
});
```

Screenshots are saved locally (in `./screenshots/argos` by default). Upload them to Snapvisor with the Snapvisor CLI, usually at the end of your CI job:

```sh
npx @snapvisor/cli upload ./screenshots
```

## Links

- [Snapvisor SDK docs](https://snapvisor.io/docs/sdks)
- [Getting started](https://snapvisor.io/docs/getting-started)

## Attribution

Based on [Argos](https://github.com/argos-ci/argos-javascript) (MIT, Copyright 2022 Smooth Code). Snapvisor modifications are copyright Devino Solutions Inc. See the [LICENSE](https://github.com/DevinoSolutions/snapvisor-js/blob/main/LICENSE).
