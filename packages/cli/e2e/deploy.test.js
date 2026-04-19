import { expect, test } from "vitest";

import { getRequiredEnv, run } from "./utils.js";

getRequiredEnv("ARGOS_TOKEN");

test("deploy publishes a static site with HTML and CSS assets", () => {
  const deployResult = run(["deploy", "../../__fixtures__/deploy"]);

  console.log(deployResult.stdout);
  console.error(deployResult.stderr);

  expect(deployResult.combined).toContain("Published:");
  expect(deployResult.combined).toMatch(/https?:\/\/\S+/);
}, 10000);
