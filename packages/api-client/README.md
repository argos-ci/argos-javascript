# Snapvisor API Client

A typed client for the [Snapvisor API](https://api.snapvisor.io/v2/), built on [openapi-fetch](https://openapi-ts.dev/openapi-fetch/).

[![npm version](https://img.shields.io/npm/v/@snapvisor/api-client.svg)](https://www.npmjs.com/package/@snapvisor/api-client)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/api-client.svg)](https://www.npmjs.com/package/@snapvisor/api-client)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/api-client.svg)](https://www.npmjs.com/package/@snapvisor/api-client)

## Installation

```sh
npm install @snapvisor/api-client
```

## Usage

Create a client and call any endpoint. Requests and responses are fully typed from the Snapvisor OpenAPI schema:

```ts
import { createClient } from "@snapvisor/api-client";

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

- [Snapvisor SDK docs](https://snapvisor.io/docs/sdks)
- [Getting started](https://snapvisor.io/docs/getting-started)

## Attribution

Based on [Argos](https://github.com/argos-ci/argos-javascript) (MIT, Copyright 2022 Smooth Code). Snapvisor modifications are copyright Devino Solutions Inc. See the [LICENSE](https://github.com/DevinoSolutions/snapvisor-js/blob/main/LICENSE).
