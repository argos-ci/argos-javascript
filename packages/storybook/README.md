# Snapvisor Storybook integration

[![npm version](https://img.shields.io/npm/v/@snapvisor/storybook.svg)](https://www.npmjs.com/package/@snapvisor/storybook)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/storybook.svg)](https://www.npmjs.com/package/@snapvisor/storybook)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/storybook.svg)](https://www.npmjs.com/package/@snapvisor/storybook)

Capture and review visual changes of your [Storybook](https://storybook.js.org/) stories with Snapvisor. It runs your stories in a real browser and uploads a screenshot of each one to Snapvisor in your CI.

Visit the [Storybook SDK documentation](https://snapvisor.io/docs/sdks) for guides, the API reference, and more.

## Installation

```sh
npm install --save-dev @snapvisor/storybook
```

## Usage

The recommended way to run visual tests is with the [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon). Register the Snapvisor plugin in your Vitest config:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { argosVitestPlugin } from "@snapvisor/storybook/vitest-plugin";

export default defineConfig({
  plugins: [
    argosVitestPlugin({
      // Upload the screenshots to Snapvisor only on CI.
      uploadToArgos: process.env.CI === "true",
    }),
  ],
});
```

A screenshot is captured for every story automatically. To capture additional screenshots (for example, at different steps of an interaction), call `argosScreenshot` inside a story's `play` function:

```ts
// Button.stories.tsx
import { argosScreenshot } from "@snapvisor/storybook/vitest";

export const Example: Story = {
  play: async (ctx) => {
    await argosScreenshot(ctx, "example");
  },
};
```

> Using the [Storybook Test Runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner) instead? Import `argosScreenshot` from `@snapvisor/storybook/test-runner` and call it from the `postVisit` hook. See the [Test Runner quickstart](https://argos-ci.com/docs/quickstart/storybook-quickstart/storybook-test-runner-quickstart).

## Compatibility

`@snapvisor/storybook` supports Storybook 8 through 11, including the 11 pre-releases. Screenshots can be taken with the [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) (Storybook 9 or later, Vitest 4 or 5) or with the [Storybook Test Runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner) (Storybook 8 or later).

## Links

- [Snapvisor SDK docs](https://snapvisor.io/docs/sdks)
- [Getting started](https://snapvisor.io/docs/getting-started)

## Attribution

Based on [Argos](https://github.com/argos-ci/argos-javascript) (MIT, Copyright 2022 Smooth Code). Snapvisor modifications are copyright Devino Solutions Inc. See the [LICENSE](https://github.com/DevinoSolutions/snapvisor-js/blob/main/LICENSE).
