import { createRecordStoryDecorator, markRecorderInstalled } from "./storybook";
import { loadGetCurrentTest } from "./test-context";

const getCurrentTest = await loadGetCurrentTest().catch(() => null);

/**
 * Storybook project annotations recording the story each Vitest test renders,
 * so `argosScreenshot()` reports its screenshots as Storybook ones.
 *
 * The Argos plugin adds them on its own to the annotations set with
 * `setProjectAnnotations()`. Pass them yourself when composing stories another
 * way, last so they see every story:
 *
 * @example
 * ```ts
 * import * as argosAnnotations from "@argos-ci/vitest/storybook";
 *
 * const { Primary } = composeStories(stories, argosAnnotations);
 * ```
 */
export const decorators: ((
  storyFn: () => unknown,
  context: unknown,
) => unknown)[] = getCurrentTest
  ? [createRecordStoryDecorator(getCurrentTest)]
  : [];

if (getCurrentTest) {
  markRecorderInstalled();
}
