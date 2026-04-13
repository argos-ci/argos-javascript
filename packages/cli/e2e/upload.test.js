import { expect, test } from "vitest";

import { getRequiredEnv, run } from "./utils.js";

getRequiredEnv("ARGOS_TOKEN");

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
}, 10000);
