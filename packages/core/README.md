# Snapvisor Node.js SDK

Node.js SDK for visual testing with Snapvisor. It powers the Snapvisor CLI and the higher-level integrations (Playwright, Cypress, …), and can be used directly to upload screenshots from Node.js.

[![npm version](https://img.shields.io/npm/v/@snapvisor/core.svg)](https://www.npmjs.com/package/@snapvisor/core)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/core.svg)](https://www.npmjs.com/package/@snapvisor/core)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/core.svg)](https://www.npmjs.com/package/@snapvisor/core)

Visit the [Node.js SDK documentation](https://snapvisor.io/docs/sdks) for guides, the API reference, and more.

## Installation

```sh
npm install @snapvisor/core
```

## Usage

Upload a directory of screenshots to Snapvisor and create a build:

```ts
import { upload } from "@snapvisor/core";

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

- [Snapvisor SDK docs](https://snapvisor.io/docs/sdks)
- [Getting started](https://snapvisor.io/docs/getting-started)

## Attribution

Based on [Argos](https://github.com/argos-ci/argos-javascript) (MIT, Copyright 2022 Smooth Code). Snapvisor modifications are copyright Devino Solutions Inc. See the [LICENSE](https://github.com/DevinoSolutions/snapvisor-js/blob/main/LICENSE).
