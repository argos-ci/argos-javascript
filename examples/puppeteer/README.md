<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for teams and AI agents.</strong></p>

# Example of Argos + Puppeteer

This example showcases Argos Visual Testing integrated with [Puppeteer](https://pptr.dev/).

## Run the example

```sh
npm install
npm test
```

`argosScreenshot` writes the screenshots to `screenshots/argos`. On CI, upload them to Argos with the Argos CLI, with the `ARGOS_TOKEN` environment variable set:

```sh
npm exec -- argos upload ./screenshots/argos
```

## Integrate with CI

This example only shows how to take screenshots using Argos + Puppeteer.

It does not include any CI integration on purpose to keep it as clear as possible.

Read the [Puppeteer quickstart](https://argos-ci.com/docs/quickstart/puppeteer-quickstart) or explore the [examples](https://github.com/argos-ci/argos-javascript/tree/main/examples) to find the best way to integrate your CI.

## Links

- [Official Argos Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)
