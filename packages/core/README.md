<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Argos Node.js SDK

Node.js SDK for visual testing with Argos. It powers the Argos CLI and the higher-level integrations (Playwright, Cypress, …), and can be used directly to upload screenshots from Node.js.

[![npm version](https://img.shields.io/npm/v/@argos-ci/core.svg)](https://www.npmjs.com/package/@argos-ci/core)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/core.svg)](https://www.npmjs.com/package/@argos-ci/core)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/core.svg)](https://www.npmjs.com/package/@argos-ci/core)

Visit the [Node.js SDK documentation](https://argos-ci.com/docs/sdks-reference/node.js-sdk) for guides, the API reference, and more.

## Installation

```sh
npm install @argos-ci/core
```

## Usage

Upload a directory of screenshots to Argos and create a build:

```ts
import { upload } from "@argos-ci/core";

const { build } = await upload({
  // Directory containing the screenshots.
  root: "./screenshots",
  // Globs matching the screenshots to upload.
  files: ["**/*.png"],
  // Defaults to the ARGOS_TOKEN environment variable.
  token: process.env.ARGOS_TOKEN,
});

console.log(`Build created: ${build.url}`);
```

## Links

- [Official SDK Docs](https://argos-ci.com/docs/sdks-reference/node.js-sdk)
- [API Reference](https://js-sdk-reference.argos-ci.com)
- [Discord](https://argos-ci.com/discord)
