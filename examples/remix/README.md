<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for teams and AI agents.</strong></p>

# Example of Argos + Remix

This example showcases Argos Visual Testing integrated to a [Remix](https://remix.run/) v2 app, using [Playwright](https://playwright.dev/) and the [Argos Playwright SDK](https://argos-ci.com/docs/quickstart/playwright-quickstart).

## Run locally

```sh
npm install
npx playwright install chromium
npm run build
npx playwright test
```

Playwright starts the built app with `npm run start` (see `webServer` in `playwright.config.ts`). Locally, the Argos screenshots are written to `test-results/` and nothing is uploaded: the Argos reporter uploads to Argos on CI only.

## Integrate with CI

This example shows how to configure GitHub Actions to run Playwright on your CI: see [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml). Add your Argos project token as the `ARGOS_TOKEN` secret, or use [tokenless authentication](https://argos-ci.com/docs/learn/integrations/github-actions-authentication) on GitHub Actions.

Read the [Argos documentation](https://argos-ci.com/docs) or explore [examples](https://github.com/argos-ci/argos-javascript/tree/main/examples) to find the best way to integrate your CI.

## Links

- [Official Argos Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)
