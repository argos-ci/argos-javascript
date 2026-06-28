import { expect, test } from "vitest";

import { run } from "./utils";

// No ARGOS_TOKEN — authentication is handled via the GitHub Actions
// tokenless exchange flow.
// It is skipped because it only works on PR, enable it if you have to test tokenless.
// eslint-disable-next-line vitest/no-disabled-tests
test.skip(
  "upload returns a full build URL using tokenless authentication",
  { tags: ["tokenless"], timeout: 20_000 },
  () => {
    const buildName = `argos-cli-e2e-tokenless-node-${process.env.NODE_VERSION}-${process.env.OS}`;
    const uploadResult = run([
      "upload",
      "../../__fixtures__",
      "--build-name",
      buildName,
    ]);

    console.log(uploadResult.stdout);
    console.error(uploadResult.stderr);

    expect(uploadResult.combined).toMatch(/https?:\/\/\S+\/builds\/\d+/);
  },
);
