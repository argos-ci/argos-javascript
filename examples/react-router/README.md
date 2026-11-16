<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for teams and AI agents.</strong></p>

# Example of Argos + React Router

This example showcases Argos Visual Testing integrated with a [React Router](https://reactrouter.com/) app, using [Playwright](https://playwright.dev/) and the [Argos Playwright SDK](https://argos-ci.com/docs/quickstart/playwright-quickstart).

- `playwright.config.ts` builds the app, starts it, and adds the Argos reporter.
- `tests/homepage.spec.ts` takes a screenshot of the homepage with `argosScreenshot`.

## Run locally

Requires Node.js 22.22 or later.

```sh
npm install
npx playwright install chromium
npx playwright test
```

Screenshots are written to `test-results/`. They are uploaded to Argos only on CI.

## Integrate with CI

This example shows how to configure GitHub Actions to run Playwright on your CI and upload the screenshots to Argos: see [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml). Copy it to the `.github/workflows` folder at the root of your repository and add your project's `ARGOS_TOKEN` as a repository secret.

Read the [Argos documentation](https://argos-ci.com/docs) or explore [examples](https://github.com/argos-ci/argos-javascript/tree/main/examples) to find the best way to integrate your CI.

## Links

- [Official Argos Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)
