<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Official Argos Storybook integration

[![npm version](https://img.shields.io/npm/v/@argos-ci/storybook.svg)](https://www.npmjs.com/package/@argos-ci/storybook)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/storybook.svg)](https://www.npmjs.com/package/@argos-ci/storybook)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/storybook.svg)](https://www.npmjs.com/package/@argos-ci/storybook)

Capture and review visual changes of your [Storybook](https://storybook.js.org/) stories with Argos. It runs your stories in a real browser and uploads a screenshot of each one to Argos in your CI.

Visit the [Storybook SDK documentation](https://argos-ci.com/docs/sdks-reference/storybook) for guides, the API reference, and more.

## Installation

```sh
npm install --save-dev @argos-ci/storybook
```

## Usage

The recommended way to run visual tests is with the [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon). Register the Argos plugin in your Vitest config:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { argosVitestPlugin } from "@argos-ci/storybook/vitest-plugin";

export default defineConfig({
  plugins: [
    argosVitestPlugin({
      // Upload the screenshots to Argos only on CI.
      uploadToArgos: process.env.CI === "true",
    }),
  ],
});
```

A screenshot is captured for every story automatically. To capture additional screenshots (for example, at different steps of an interaction), call `argosScreenshot` inside a story's `play` function:

```ts
// Button.stories.tsx
import { argosScreenshot } from "@argos-ci/storybook/vitest";

export const Example: Story = {
  play: async (ctx) => {
    await argosScreenshot(ctx, "example");
  },
};
```

> Using the [Storybook Test Runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner) instead? Import `argosScreenshot` from `@argos-ci/storybook/test-runner` and call it from the `postVisit` hook. See the [Test Runner quickstart](https://argos-ci.com/docs/quickstart/storybook-quickstart/storybook-test-runner-quickstart).

## Links

- [Official SDK Docs](https://argos-ci.com/docs/sdks-reference/storybook)
- [Quickstart](https://argos-ci.com/docs/quickstart/storybook-quickstart)
- [Discord](https://argos-ci.com/discord)
