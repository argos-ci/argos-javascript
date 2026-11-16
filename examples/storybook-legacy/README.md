<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for teams and AI agents.</strong></p>

# Example of Argos + Storybook and Storycap

This example showcases Argos Visual Testing integrated to [Storybook](https://storybook.js.org/) using [Storycap](https://github.com/reg-viz/storycap) to capture screenshots.

Storycap is the way to go on a legacy Storybook (\<v8). Storycap supports Storybook 7 and 8, so this example runs Storybook 8, the newest version it works with. On Storybook 8 or later, prefer the [Storybook Test Runner example](https://github.com/argos-ci/argos-javascript/tree/main/examples/storybook-test-runner) or, on Storybook 9 or later, the [Storybook Vitest example](https://github.com/argos-ci/argos-javascript/tree/main/examples/storybook-vitest).

## Run it locally

```sh
npm install
npm run build-storybook
npx storycap --serverCmd "npx http-server ./storybook-static --port 6006" http://127.0.0.1:6006 --outDir ./screenshots
```

Storycap drives the Google Chrome installed on your machine. Do not install Puppeteer 25 or later next to it: Storycap would use it to find Chrome and fail.

## Integrate with CI

This example shows how to configure GitHub Actions to build Storybook, capture screenshots with Storycap, and upload them to Argos on your CI: see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

Read Argos' [legacy Storybook (\<v8) quickstart](https://argos-ci.com/docs/quickstart/storybook-quickstart/storybook-legacy-less-than-v8-quickstart) to learn how to integrate Argos with Storybook and Storycap.

## Links

- [Official Argos Docs](https://argos-ci.com/docs)
- [Argos Discord](https://argos-ci.com/discord)
