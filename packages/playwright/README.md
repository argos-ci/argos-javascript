<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Official Argos Playwright integration

[![npm version](https://img.shields.io/npm/v/@argos-ci/playwright.svg)](https://www.npmjs.com/package/@argos-ci/playwright)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/playwright.svg)](https://www.npmjs.com/package/@argos-ci/playwright)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/playwright.svg)](https://www.npmjs.com/package/@argos-ci/playwright)

Capture stable Argos screenshots from your [Playwright](https://playwright.dev/) tests, and report failure screenshots and traces to Argos.

Visit the [Playwright SDK documentation](https://argos-ci.com/docs/sdks-reference/playwright) for guides, the API reference, and more.

## Installation

```sh
npm install --save-dev @argos-ci/playwright
```

## Usage

Set up the Argos reporter in your Playwright config:

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { createArgosReporterOptions } from "@argos-ci/playwright/reporter";

export default defineConfig({
  // ... other configuration
  reporter: [
    // Use "dot" reporter on CI, "list" otherwise (Playwright default).
    process.env.CI ? ["dot"] : ["list"],

    // Add the Argos reporter.
    [
      "@argos-ci/playwright/reporter",
      // Upload the screenshots to Argos only on CI.
      createArgosReporterOptions({ uploadToArgos: !!process.env.CI }),
    ],
  ],
});
```

Then capture stable screenshots with `argosScreenshot` in your tests:

```ts
// tests/example.spec.ts
import { test } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

test("screenshot homepage", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await argosScreenshot(page, "homepage");
});
```

## Links

- [Official SDK Docs](https://argos-ci.com/docs/sdks-reference/playwright)
- [Quickstart](https://argos-ci.com/docs/quickstart/playwright-quickstart)
- [Discord](https://argos-ci.com/discord)
