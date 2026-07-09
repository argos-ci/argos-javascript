<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Official Argos Cypress integration

[![npm version](https://img.shields.io/npm/v/@argos-ci/cypress.svg)](https://www.npmjs.com/package/@argos-ci/cypress)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/cypress.svg)](https://www.npmjs.com/package/@argos-ci/cypress)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/cypress.svg)](https://www.npmjs.com/package/@argos-ci/cypress)

Capture stable Argos screenshots from your [Cypress](https://www.cypress.io/) tests.

Visit the [Cypress SDK documentation](https://argos-ci.com/docs/sdks-reference/cypress) for guides, the API reference, and more.

## Installation

```sh
npm install --save-dev @argos-ci/cypress
```

## Usage

Register the Argos task in your Cypress config:

```ts
// cypress.config.js
const { defineConfig } = require("cypress");
const { registerArgosTask } = require("@argos-ci/cypress/task");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      registerArgosTask(on, config, {
        // Upload the screenshots to Argos only on CI.
        uploadToArgos: !!process.env.CI,
      });

      return config;
    },
  },
});
```

Import the command in your support file:

```ts
// cypress/support/e2e.js
import "@argos-ci/cypress/support";
```

Then capture stable screenshots with `cy.argosScreenshot` in your tests:

```ts
// cypress/e2e/example.cy.js
describe("Homepage", () => {
  it("takes a screenshot", () => {
    cy.visit("http://localhost:3000");
    cy.argosScreenshot("homepage");
  });
});
```

## Links

- [Official SDK Docs](https://argos-ci.com/docs/sdks-reference/cypress)
- [Quickstart](https://argos-ci.com/docs/quickstart/cypress-quickstart)
- [Discord](https://argos-ci.com/discord)
