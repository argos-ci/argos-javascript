import { argosScreenshot } from "@argos-ci/vitest";
import { expect, test } from "vitest";
import { Primary } from "./csf-factories/Button.stories";
import { readMetadata } from "./metadata";

// In a file of its own: importing a CSF Factories preview replaces the project
// annotations of the whole file.
test("reports a CSF Factories story as a Storybook screenshot", async () => {
  await Primary.run();

  const metadata = await readMetadata(
    await argosScreenshot("portable-stories/csf-factories-button"),
  );
  expect(metadata.automationLibrary.name).toBe("storybook");
  expect(metadata.story).toEqual({
    id: "factories-button--primary",
    tags: expect.any(Array),
    play: false,
  });
});
