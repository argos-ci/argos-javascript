<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for AI-native engineering teams.</strong></p>

# Argos API Client

A typed client for the [Argos API](https://api.argos-ci.com/v2/), built on [openapi-fetch](https://openapi-ts.dev/openapi-fetch/).

[![npm version](https://img.shields.io/npm/v/@argos-ci/api-client.svg)](https://www.npmjs.com/package/@argos-ci/api-client)
[![npm dm](https://img.shields.io/npm/dm/@argos-ci/api-client.svg)](https://www.npmjs.com/package/@argos-ci/api-client)
[![npm dt](https://img.shields.io/npm/dt/@argos-ci/api-client.svg)](https://www.npmjs.com/package/@argos-ci/api-client)

## Installation

```sh
npm install @argos-ci/api-client
```

## Usage

Create a client and call any endpoint. Requests and responses are fully typed from the Argos OpenAPI schema:

```ts
import { createClient } from "@argos-ci/api-client";

const client = createClient({
  authToken: process.env.ARGOS_TOKEN,
});

const { data, error } = await client.GET("/project");

if (error) {
  throw new Error(error.error);
}

console.log(data);
```

## Links

- [Official Docs](https://argos-ci.com/docs)
- [Discord](https://argos-ci.com/discord)
