import { argosScreenshot } from "@argos-ci/vitest";
import { afterEach, expect } from "vitest";
import { readMetadata } from "./metadata";

// `@storybook/addon-vitest` turns each story into a test: screenshot it with
// `@argos-ci/vitest`, which must report it as a Storybook screenshot.
afterEach(async ({ task }) => {
  // A story the addon skips (by tag) never rendered: nothing to check.
  if (task.result?.state === "skip") {
    return;
  }
  const { storyId } = task.meta as { storyId?: string };
  expect(storyId).toMatch(/^example-header--/);

  const metadata = await readMetadata(
    await argosScreenshot(`addon-vitest/${storyId}`),
  );
  expect(metadata.sdk.name).toBe("@argos-ci/vitest");
  expect(metadata.automationLibrary.name).toBe("@storybook/addon-vitest");
  expect(metadata.story).toEqual({
    id: storyId,
    tags: expect.arrayContaining(["autodocs"]),
    play: false,
  });
});
