import { expect, test } from "vitest";

import { getRequiredEnv, run } from "./utils";

getRequiredEnv("ARGOS_TOKEN");

// This test uploads the full __fixtures__ directory, which includes a 10MB PNG
// stress fixture. That file is sharp-optimized, hashed, and uploaded to S3 over
// a real network connection. It relies on the generous e2e timeout configured
// in vitest.config.ts.
test("upload returns a full build URL", () => {
  const buildName = `argos-cli-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}`;
  const uploadResult = run([
    "upload",
    "../../__fixtures__",
    "--build-name",
    buildName,
  ]);

  console.log(uploadResult.stdout);
  console.error(uploadResult.stderr);

  expect(uploadResult.combined).toMatch(/https?:\/\/\S+\/builds\/\d+/);
});
