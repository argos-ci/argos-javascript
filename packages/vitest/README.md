<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Official Argos Vitest integration

[![npm version](https://img.shields.io/npm/v/@argos-ci/vitest.svg)](https://www.npmjs.com/package/@argos-ci/vitest)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/vitest.svg)](https://www.npmjs.com/package/@argos-ci/vitest)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/vitest.svg)](https://www.npmjs.com/package/@argos-ci/vitest)

Capture Argos screenshots directly from your [Vitest browser tests](https://vitest.dev/guide/browser/).

Visit the [Vitest SDK documentation](https://argos-ci.com/docs/reference/vitest) for guides, API and more.

## Installation

Install the package:

```sh
npm install --save-dev @argos-ci/vitest
```

`argosSnapshot` runs in any Vitest test — browser or Node — and needs nothing else.

To capture screenshots with `argosScreenshot`, run your tests in
[Vitest browser mode](https://vitest.dev/guide/browser/) with the
[Playwright provider](https://vitest.dev/guide/browser/playwright) and install the
following peer dependencies:

```sh
npm install --save-dev vitest @vitest/browser @vitest/browser-playwright playwright
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

### Automatic naming

The name is optional. When omitted, Argos derives one from the current test,
mimicking [Vitest snapshots](https://vitest.dev/guide/snapshot). Several unnamed
captures in the same test get an incrementing counter so they stay unique:

```ts
test("Button", async () => {
  render(<Button>Click me</Button>);
  await argosScreenshot(); // -> "src/Button.test.tsx > Button 1"
  await argosScreenshot(); // -> "src/Button.test.tsx > Button 2"
});
```

Unlike Vitest — which keeps a per-file `.snap`, so its keys only need to be
unique within a file — Argos names are **global** across the build. The
generated name therefore includes the test file path, so two tests with the same
title in different files never collide.

## Snapshots

`argosSnapshot` captures a snapshot of any value — not just a screenshot — and
uploads it to Argos to diff across builds, mimicking
[Vitest snapshots](https://vitest.dev/guide/snapshot). Unlike `argosScreenshot`,
it does not need a browser and works in **both** browser and Node tests.

The value comes first; the name is optional. Omit it to auto-name the snapshot
from the current test (like screenshots above), or pass `options.name` to set it
explicitly:

```ts
import { test } from "vitest";
import { argosSnapshot } from "@argos-ci/vitest";

test("API response", async () => {
  const user = await fetchUser();
  // Objects are serialized with `@vitest/pretty-format`, strings are written
  // verbatim.
  await argosSnapshot(user); // -> "src/user.test.ts > API response 1"
  await argosSnapshot(user, { name: "user" }); // explicit name
});
```

Use the `extension` option to control how Argos renders and diffs the snapshot,
and `tag` to attach tags:

```ts
await argosSnapshot(JSON.stringify(config, null, 2), {
  name: "config",
  extension: ".json",
  tag: "config",
});
```

Screenshots and snapshots are both written to the `./snapshots` directory by
default (configurable via the plugin `root` option) and uploaded by the reporter
when `uploadToArgos` is enabled.

## Links

- [Official SDK Docs](https://argos-ci.com/docs/reference/vitest)
- [Quickstart](https://argos-ci.com/docs/quickstart/vitest-quickstart)
- [Discord](https://argos-ci.com/discord)
