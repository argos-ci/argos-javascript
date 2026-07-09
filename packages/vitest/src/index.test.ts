import { expect, it } from "vitest";
import { argosScreenshot, checkIsVitestEnv } from "./index";

it("detects the Vitest environment", async () => {
  await expect(checkIsVitestEnv()).resolves.toBe(true);
});

it("exports the argosScreenshot function", () => {
  expect(typeof argosScreenshot).toBe("function");
});
