# Snapvisor Vitest integration

[![npm version](https://img.shields.io/npm/v/@snapvisor/vitest.svg)](https://www.npmjs.com/package/@snapvisor/vitest)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/vitest.svg)](https://www.npmjs.com/package/@snapvisor/vitest)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/vitest.svg)](https://www.npmjs.com/package/@snapvisor/vitest)

Capture screenshots and snapshots from your [Vitest browser tests](https://vitest.dev/guide/browser/) and upload them to [Snapvisor](https://app.snapvisor.io), which compares them with your approved baseline and reports the result on your pull request.

Visit the [Vitest SDK documentation](https://snapvisor.io/docs/sdks) for guides, API and more.

## Installation

Install the package:

```sh
npm install --save-dev @snapvisor/vitest
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
import { argosVitestPlugin } from "@snapvisor/vitest/plugin";

export default defineConfig({
  plugins: [
    argosVitestPlugin({
      // Upload the screenshots to Snapvisor at the end of the run.
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
import { argosScreenshot } from "@snapvisor/vitest";
import { Button } from "./Button";

test("Button", async () => {
  render(<Button>Click me</Button>);
  await argosScreenshot("button");
});
```

### Automatic naming

The name is optional. When omitted, Snapvisor derives one from the current test,
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
unique within a file — Snapvisor names are **global** across the build. The
generated name therefore includes the test file path, so two tests with the same
title in different files never collide.

## Snapshots

`argosSnapshot` captures a snapshot of any value — not just a screenshot — and
uploads it to Snapvisor to diff across builds, mimicking
[Vitest snapshots](https://vitest.dev/guide/snapshot). Unlike `argosScreenshot`,
it does not need a browser and works in **both** browser and Node tests.

The value comes first; the name is optional. Omit it to auto-name the snapshot
from the current test (like screenshots above), or pass `options.name` to set it
explicitly:

```ts
import { test } from "vitest";
import { argosSnapshot } from "@snapvisor/vitest";

test("API response", async () => {
  const user = await fetchUser();
  // Objects are serialized with `@vitest/pretty-format`, strings are written
  // verbatim.
  await argosSnapshot(user); // -> "src/user.test.ts > API response 1"
  await argosSnapshot(user, { name: "user" }); // explicit name
});
```

Use the `extension` option to control how Snapvisor renders and diffs the snapshot,
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

## Authentication

Uploads need your Snapvisor project token. Create a project in the [Snapvisor app](https://app.snapvisor.io), copy its token, and expose it to your CI job as the `ARGOS_TOKEN` environment variable (store it as a CI secret, never in the repository). The variable keeps the upstream Argos name on purpose, so pipelines already wired for the Argos SDKs keep working. On GitHub Actions you can skip the token with tokenless authentication.

## Links

- [Snapvisor SDK docs](https://snapvisor.io/docs/sdks)
- [Getting started](https://snapvisor.io/docs/getting-started)

## Attribution

Based on [Argos](https://github.com/argos-ci/argos-javascript) (MIT, Copyright 2022 Smooth Code). Snapvisor modifications are copyright Devino Solutions Inc. See the [LICENSE](https://github.com/DevinoSolutions/snapvisor-js/blob/main/LICENSE).
