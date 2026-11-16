import { expect, test } from "vitest";

import { getRequiredEnv, run, type CommandError } from "./utils";

getRequiredEnv("ARGOS_TOKEN");

test("deploys a static site with HTML and CSS assets", () => {
  const deployResult = run(["deploy", "../../__fixtures__/deploy"]);

  console.log(deployResult.stdout);
  console.error(deployResult.stderr);

  expect(deployResult.combined).toContain("Deployed:");
  expect(deployResult.combined).toMatch(/https?:\/\/\S+/);
});

test("asks for a directory or --url when both are missing", () => {
  let error: CommandError | undefined;
  try {
    run(["deploy"]);
  } catch (err) {
    error = err as CommandError;
  }
  expect(error?.status).toBe(1);
  expect(error?.stderr).toContain("Error: Missing directory or --url.");
});
