<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Argos Command Line Interface

Interact with and upload screenshots to [argos-ci.com](https://argos-ci.com) from the command line.

[![npm version](https://img.shields.io/npm/v/@argos-ci/cli.svg)](https://www.npmjs.com/package/@argos-ci/cli)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/cli.svg)](https://www.npmjs.com/package/@argos-ci/cli)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/cli.svg)](https://www.npmjs.com/package/@argos-ci/cli)

Visit the [Argos CLI documentation](https://argos-ci.com/docs/reference/argos-command-line-interface-cli) for the full command reference and more.

## Installation

```sh
npm install --save-dev @argos-ci/cli
```

## Usage

Upload a directory of screenshots to Argos. Authenticate with your project token via the `ARGOS_TOKEN` environment variable:

```sh
ARGOS_TOKEN="<your-argos-token>" npx @argos-ci/cli upload ./screenshots
```

The CLI also exposes commands to `deploy` a static build, inspect and `review` builds, post a `comment`, and more. List them all with:

```sh
npx @argos-ci/cli --help
```

## Links

- [Official CLI Docs](https://argos-ci.com/docs/reference/argos-command-line-interface-cli)
- [Discord](https://argos-ci.com/discord)
