import { expect, it } from "vitest";
import { TestRunner } from "vitest";
import { resolveAutoName } from "./auto-name";

it("returns an explicit name verbatim", async () => {
  await expect(resolveAutoName("button")).resolves.toBe("button");
});

it("generates a name from the current test with a per-test counter", async () => {
  const testName = TestRunner.getCurrentTest()?.fullName;
  expect(testName).toBeTruthy();

  // Each auto-named capture in the same test gets an incrementing counter,
  // mimicking Vitest's `${testName} ${count}` snapshot naming.
  await expect(resolveAutoName()).resolves.toBe(`${testName} 1`);
  await expect(resolveAutoName()).resolves.toBe(`${testName} 2`);
});

it("restarts the counter for each test", async () => {
  const testName = TestRunner.getCurrentTest()?.fullName;
  // A different test task, so the counter starts over at 1.
  await expect(resolveAutoName()).resolves.toBe(`${testName} 1`);
});
