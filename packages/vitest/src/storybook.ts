import type { ScreenshotMetadata } from "@argos-ci/util";
import { loadGetCurrentTest, type CurrentTask } from "./test-context";

/**
 * Whether a test renders a Storybook story, and which one. Gathered on the test
 * side and sent to the Node command, which reports the screenshot as a
 * Storybook one.
 */
export type StorybookContext = {
  /**
   * How the story runs:
   * - `addon-vitest`: `@storybook/addon-vitest` turned the story into a test;
   * - `portable-stories`: the test rendered a composed story
   *   (`composeStories()`), with `Story.run()` or as a component.
   */
  source: "addon-vitest" | "portable-stories";
  /**
   * The story, or `null` when Storybook gave it a placeholder id, shared by
   * unrelated stories (see {@link PLACEHOLDER_STORY_TITLE}).
   */
  story: NonNullable<ScreenshotMetadata["story"]> | null;
};

/**
 * Key of the task meta where the Argos decorator records the story a test
 * renders.
 */
const RECORDED_STORY_META_KEY = "argosStory";

/**
 * Placeholders Storybook falls back to when it composes a story outside its
 * indexer (Storybook itself, `@storybook/addon-vitest`): the title of a meta
 * without `title`, and the name of a CSF Factories story, which it cannot name
 * after its export. Ids built from them are shared by unrelated stories.
 */
const PLACEHOLDER_STORY_TITLE = "ComposedStory";
const PLACEHOLDER_STORY_NAME = "Unnamed Story";

/**
 * Global where Storybook keeps the project annotations portable stories are
 * composed with: `setProjectAnnotations()` and CSF Factories' `definePreview()`
 * write it, `composeStory()` reads it. Storybook internal, but stable since
 * Storybook 8 and also relied on by `@storybook/addon-vitest`.
 */
const PROJECT_ANNOTATIONS_GLOBAL = "globalProjectAnnotations";

/** Marks the Argos decorator, so it is added only once. */
const RECORD_STORY_DECORATOR = Symbol.for("argos.storybook.recordStory");

type RecordedStory = {
  id: string;
  tags: string[];
  play: boolean;
  /** The id is built from a placeholder, see {@link PLACEHOLDER_STORY_TITLE}. */
  placeholderId: boolean;
};

type StoryDecorator = ((
  storyFn: () => unknown,
  context: unknown,
) => unknown) & {
  [RECORD_STORY_DECORATOR]?: true;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string")
    : [];
}

function isRecordedStory(value: unknown): value is RecordedStory {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.placeholderId === "boolean"
  );
}

/**
 * Create the Storybook decorator that records, on the running Vitest test, the
 * story being rendered.
 *
 * Nothing else ties a portable story to a test: Storybook marks only the tests
 * `@storybook/addon-vitest` generates, and its globals are set for every test
 * of the project, stories or not. Project decorators run however the story is
 * rendered (`Story.run()`, `render(<Story />)`), and recording on the test (not
 * globally) keeps a story from leaking into the screenshots of the next tests.
 */
function createRecordStoryDecorator(
  getCurrentTest: () => CurrentTask | undefined,
): StoryDecorator {
  const decorator: StoryDecorator = (storyFn, context) => {
    const task = getCurrentTest();
    if (task?.meta && isObject(context) && typeof context.id === "string") {
      const story: RecordedStory = {
        id: context.id,
        tags: getTags(context.tags),
        play: typeof context.playFunction === "function",
        placeholderId:
          context.title === PLACEHOLDER_STORY_TITLE ||
          context.name === PLACEHOLDER_STORY_NAME,
      };
      task.meta[RECORDED_STORY_META_KEY] = story;
    }
    return storyFn();
  };
  decorator[RECORD_STORY_DECORATOR] = true;
  return decorator;
}

/**
 * Add the Argos decorator to Storybook's project annotations, now and every
 * time they are set again.
 *
 * Runs in a setup file registered ahead of the user's ones, so it is in place
 * before `setProjectAnnotations()` is called — in a setup file or a test file
 * alike — and before any story is composed.
 */
export async function installStoryRecorder(): Promise<void> {
  // The setup file runs before every test file, Storybook or not: without a
  // way to reach the current test (Vitest 4.0 in browser mode), skip recording
  // rather than fail them all.
  const getCurrentTest = await loadGetCurrentTest().catch(() => null);
  if (!getCurrentTest) {
    return;
  }
  const decorator = createRecordStoryDecorator(getCurrentTest);

  const addDecorator = (annotations: unknown): unknown => {
    if (
      isObject(annotations) &&
      Array.isArray(annotations.decorators) &&
      !annotations.decorators.some(
        (existing: StoryDecorator) => existing?.[RECORD_STORY_DECORATOR],
      )
    ) {
      // Mutate rather than copy: Storybook marks the object itself with
      // non-enumerable symbols a copy would lose.
      annotations.decorators = [...annotations.decorators, decorator];
    }
    return annotations;
  };

  const target = globalThis as Record<string, unknown>;
  let annotations = addDecorator(target[PROJECT_ANNOTATIONS_GLOBAL]);
  Object.defineProperty(target, PROJECT_ANNOTATIONS_GLOBAL, {
    configurable: true,
    enumerable: true,
    get: () => annotations,
    set: (value: unknown) => {
      annotations = addDecorator(value);
    },
  });
}

/**
 * Get the Storybook context of a test, or `null` when it renders no story.
 */
export function getStorybookContext(
  task: CurrentTask,
): StorybookContext | null {
  const meta = task.meta ?? {};

  // `@storybook/addon-vitest` marks the tests it generates with the story id,
  // computed by the Storybook indexer, and exposes the composed story (a
  // function carrying the story's fields) on the context.
  if (typeof meta.storyId === "string") {
    const story = task.context?.story as
      { tags?: unknown; play?: unknown } | undefined;
    return {
      source: "addon-vitest",
      story: {
        id: meta.storyId,
        tags: getTags(story?.tags),
        play: typeof story?.play === "function",
      },
    };
  }

  const recorded = meta[RECORDED_STORY_META_KEY];
  if (isRecordedStory(recorded)) {
    return {
      source: "portable-stories",
      story: recorded.placeholderId
        ? null
        : { id: recorded.id, tags: recorded.tags, play: recorded.play },
    };
  }

  return null;
}
