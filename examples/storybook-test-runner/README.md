<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for teams and AI agents.</strong></p>

# Example of Argos + Storybook Test Runner

This example showcases Argos Visual Testing integrated to [Storybook](https://storybook.js.org/) with the [Storybook Test Runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner). The `postVisit` hook in [`.storybook/test-runner.ts`](.storybook/test-runner.ts) captures a screenshot of every story.

Storybook now recommends the Vitest addon over the Test Runner for Vite-based projects: see the [Storybook Vitest example](https://github.com/argos-ci/argos-javascript/tree/main/examples/storybook-vitest).

## Run it locally

```sh
npm install
npx playwright install chromium
npm run build-storybook

# Serve Storybook, then run the tests from another terminal
npx http-server ./storybook-static --port 6006 --silent
npm run test-storybook
```

Screenshots are written to `./screenshots`. On CI, upload them to Argos with `npm exec -- argos upload ./screenshots`.

## Integrate with CI

This example only shows how to take screenshots using Storybook.

It does not include any CI integration on purpose to keep it as clear as possible.

Read [Argos documentation](https://argos-ci.com/docs) or explore [Storybook Testing in CI guide](https://storybook.js.org/docs/writing-tests/in-ci) to learn how to integrate into your CI.

## Links

- [Quickstart with Argos + Storybook Test Runner](https://argos-ci.com/docs/quickstart/storybook-quickstart/storybook-test-runner-quickstart)
- [Storybook SDK Reference](https://argos-ci.com/docs/reference/storybook)
- [Official Argos Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)
