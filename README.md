<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Official Argos SDKs for JavaScript

All Argos JavaScript SDK packages are centralized in that mono-repo, usually available on `@argos-ci/` namespace. It provides a convenient interface and improves consistency between various JavaScript environments.

## Links

- [Official SDK Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)

## Supported environments

For each major JavaScript platform, there is a specific high-level SDK that provides all the tools you need in a single package. Please refer to the README and instructions of those SDKs for more detailed information:

- [`@argos-ci/playwright`](https://github.com/argos-ci/argos-javascript/tree/main/packages/playwright): capture screenshots from your [Playwright](https://playwright.dev/) tests
- [`@argos-ci/cypress`](https://github.com/argos-ci/argos-javascript/tree/main/packages/cypress): capture screenshots from your [Cypress](https://www.cypress.io/) tests
- [`@argos-ci/puppeteer`](https://github.com/argos-ci/argos-javascript/tree/main/packages/puppeteer): capture screenshots from your [Puppeteer](https://github.com/puppeteer/puppeteer) tests
- [`@argos-ci/webdriverio`](https://github.com/argos-ci/argos-javascript/tree/main/packages/webdriverio): capture screenshots from your [WebdriverIO](https://webdriver.io) tests
- [`@argos-ci/storybook`](https://github.com/argos-ci/argos-javascript/tree/main/packages/storybook): capture screenshots of your [Storybook](https://storybook.js.org/) stories
- [`@argos-ci/vitest`](https://github.com/argos-ci/argos-javascript/tree/main/packages/vitest): capture screenshots from your [Vitest](https://vitest.dev/) browser tests
- [`@argos-ci/cli`](https://github.com/argos-ci/argos-javascript/tree/main/packages/cli): interact with and upload screenshots to [argos-ci.com](https://argos-ci.com) via command line
- [`@argos-ci/core`](https://github.com/argos-ci/argos-javascript/tree/main/packages/core): SDK for Node.js, the base to create other integrations
