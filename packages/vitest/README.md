<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for modern engineering teams.</strong></p>

# Official Argos Vitest integration

[![npm version](https://img.shields.io/npm/v/@argos-ci/vitest.svg)](https://www.npmjs.com/package/@argos-ci/vitest)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/vitest.svg)](https://www.npmjs.com/package/@argos-ci/vitest)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/vitest.svg)](https://www.npmjs.com/package/@argos-ci/vitest)

Capture Argos screenshots directly from your [Vitest browser tests](https://vitest.dev/guide/browser/).

Visit [argos-ci.com/docs/vitest](https://argos-ci.com/docs/vitest) for guides, API and more.

## Requirements

`@argos-ci/vitest` runs in [Vitest browser mode](https://vitest.dev/guide/browser/) with the
[Playwright provider](https://vitest.dev/guide/browser/playwright). Install the following peer
dependencies alongside it:

```sh
npm install --save-dev @argos-ci/vitest vitest @vitest/browser @vitest/browser-playwright playwright
```

## Usage

Register the plugin in your Vitest config:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { argosVitestPlugin } from "@argos-ci/vitest/plugin";

export default defineConfig({
  plugins: [
    argosVitestPlugin({
      // Upload the screenshots to Argos at the end of the run.
      uploadToArgos: process.env.CI === "true",
    }),
  ],
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
```

Then take screenshots from your browser tests:

```ts
import { test } from "vitest";
import { render } from "vitest-browser-react";
import { argosScreenshot } from "@argos-ci/vitest";
import { Button } from "./Button";

test("Button", async () => {
  render(<Button>Click me</Button>);
  await argosScreenshot("button");
});
```

## Links

- [Official SDK Docs](https://argos-ci.com/docs/)
- [Discord](https://argos-ci.com/discord)
