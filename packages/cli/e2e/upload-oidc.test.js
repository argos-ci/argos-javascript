import { expect, test } from "vitest";

import { run } from "./utils.js";

// No ARGOS_TOKEN — authentication is handled via GitHub Actions OIDC.
test(
  "upload returns a full build URL using OIDC authentication",
  { tags: ["oidc"], timeout: 20_000 },
  () => {
    const buildName = `argos-cli-e2e-oidc-node-${process.env.NODE_VERSION}-${process.env.OS}`;
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
