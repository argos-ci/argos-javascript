# Snapvisor Playwright integration

[![npm version](https://img.shields.io/npm/v/@snapvisor/playwright.svg)](https://www.npmjs.com/package/@snapvisor/playwright)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/playwright.svg)](https://www.npmjs.com/package/@snapvisor/playwright)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/playwright.svg)](https://www.npmjs.com/package/@snapvisor/playwright)

Capture stable Snapvisor screenshots from your [Playwright](https://playwright.dev/) tests, and report failure screenshots and traces to Snapvisor.

Visit the [Playwright SDK documentation](https://snapvisor.io/docs/sdks) for guides, the API reference, and more.

## Installation

```sh
npm install --save-dev @snapvisor/playwright
```

## Usage

Set up the Snapvisor reporter in your Playwright config:

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { createArgosReporterOptions } from "@snapvisor/playwright/reporter";

export default defineConfig({
  // ... other configuration
  reporter: [
    // Use "dot" reporter on CI, "list" otherwise (Playwright default).
    process.env.CI ? ["dot"] : ["list"],

    // Add the Snapvisor reporter.
    [
      "@snapvisor/playwright/reporter",
      // Upload the screenshots to Snapvisor only on CI.
      createArgosReporterOptions({ uploadToArgos: !!process.env.CI }),
    ],
  ],
});
```

Then capture stable screenshots with `argosScreenshot` in your tests:

```ts
// tests/example.spec.ts
import { test } from "@playwright/test";
import { argosScreenshot } from "@snapvisor/playwright";

test("screenshot homepage", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await argosScreenshot(page, "homepage");
});
```

## Links

- [Snapvisor SDK docs](https://snapvisor.io/docs/sdks)
- [Getting started](https://snapvisor.io/docs/getting-started)

## Attribution

Based on [Argos](https://github.com/argos-ci/argos-javascript) (MIT, Copyright 2022 Smooth Code). Snapvisor modifications are copyright Devino Solutions Inc. See the [LICENSE](https://github.com/DevinoSolutions/snapvisor-js/blob/main/LICENSE).
