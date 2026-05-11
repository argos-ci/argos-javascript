import { expect, test } from "vitest";

import { getRequiredEnv, run } from "./utils.js";

getRequiredEnv("ARGOS_TOKEN");

test("skip returns a build URL", { timeout: 20_000 }, () => {
  const buildName = `argos-cli-e2e-skipped-node-${process.env.NODE_VERSION}-${process.env.OS}`;
  const skipResult = run(["skip", "--build-name", buildName]);

  expect(skipResult.combined).toMatch(/\/builds\/(\d+)/);
});
