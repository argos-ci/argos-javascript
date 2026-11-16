<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for teams and AI agents.</strong></p>

# Example of Argos + Storybook Vitest

This example showcases Argos Visual Testing integrated to [Storybook](https://storybook.js.org/) with the [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon). The Argos plugin in [`vite.config.js`](vite.config.js) captures a screenshot of every story.

## Run it locally

```sh
npm install
npx playwright install chromium
npm run test-storybook
```

Screenshots are written to `./screenshots`. The plugin uploads them to Argos only on CI.

## Integrate with CI

This example only shows how to take screenshots using Storybook.

It does not include any CI integration on purpose to keep it as clear as possible.

Read [Argos documentation](https://argos-ci.com/docs) or explore [Storybook Testing in CI guide](https://storybook.js.org/docs/writing-tests/in-ci) to learn how to integrate into your CI.

## Links

- [Quickstart with Argos + Storybook + Vitest](https://argos-ci.com/docs/quickstart/storybook-quickstart)
- [Storybook SDK Reference](https://argos-ci.com/docs/reference/storybook)
- [Official Argos Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)
