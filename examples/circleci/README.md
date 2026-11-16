<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for teams and AI agents.</strong></p>

# Example of Argos running on CircleCI

This example showcases Argos Visual Testing running on [CircleCI](https://circleci.com/).

## Setup

- [Create a project in Argos](https://app.argos-ci.com/new) and copy its [project token](https://argos-ci.com/docs/learn/account-and-access/project-tokens).
- Add it as an `ARGOS_TOKEN` [environment variable on CircleCI](https://circleci.com/docs/env-vars) (values are masked in the job output).
- Replace the placeholder comment in `.circleci/config.yml` with the steps that save your screenshots to `./screenshots`.

## Links

- [Official Argos Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)
