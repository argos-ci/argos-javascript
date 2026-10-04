// The browser entry: this module also runs in the browser, as a setup file.
import {
  hasPlay,
  mergeTags,
  type ScreenshotMetadata,
} from "@argos-ci/util/browser";
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
   * unrelated stories (see {@link checkIsPlaceholderId}).
   */
  story: NonNullable<ScreenshotMetadata["story"]> | null;
};

/**
 * Packages a capture of a story reports as its automation library, by how the
 * story runs, the first installed wins.
 */
export const STORYBOOK_AUTOMATION_LIBRARIES = {
  "addon-vitest": ["@storybook/addon-vitest", "storybook"],
  "portable-stories": ["storybook"],
} as const satisfies Record<StorybookContext["source"], readonly string[]>;

/**
 * Key of the task meta where the Argos decorator records the story a test
 * renders.
 */
const RECORDED_STORY_META_KEY = "argosStory";

/**
 * Global where Storybook keeps the project annotations portable stories are
 * composed with: `setProjectAnnotations()` and CSF Factories' `definePreview()`
 * write it, `composeStory()` reads it. Storybook internal, but stable since
 * Storybook 8 and also relied on by `@storybook/addon-vitest`.
 */
const PROJECT_ANNOTATIONS_GLOBAL = "globalProjectAnnotations";

/**
 * Global where Storybook keeps its addons store, set as soon as its preview API
 * is loaded. Storybook internal, only read to warn when stories go undetected.
 */
const STORYBOOK_PREVIEW_GLOBAL = "__STORYBOOK_ADDONS_PREVIEW";

/** Marks the Argos decorator, so it is added only once. */
const RECORD_STORY_DECORATOR = Symbol.for("argos.storybook.recordStory");

/** Set once the Argos decorator can record stories. */
const RECORDER_INSTALLED = Symbol.for("argos.storybook.recorderInstalled");

/** Set once the warning about undetected stories was shown. */
const UNDETECTED_WARNING_SHOWN = Symbol.for("argos.storybook.undetectedWarned");

type RecordedStory = {
  id: string;
  tags: string[];
  play: boolean;
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

/** The fields Argos reads on a composed story, a function carrying them. */
type ComposedStory = ((...args: never[]) => unknown) & {
  id: string;
  tags?: unknown;
  parameters?: { tags?: unknown };
};

function isComposedStory(value: unknown): value is ComposedStory {
  return (
    typeof value === "function" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

function isRecordedStory(value: unknown): value is RecordedStory {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    Array.isArray(value.tags) &&
    typeof value.play === "boolean"
  );
}

/**
 * Whether a story id is built from the placeholders Storybook falls back to
 * when it composes a story outside its indexer (Storybook itself,
 * `@storybook/addon-vitest`): `ComposedStory` for a meta with neither `title`
 * nor `id`, `Unnamed Story` for a CSF Factories story it cannot name after its
 * export. Such ids are shared by unrelated stories.
 */
function checkIsPlaceholderId(id: string): boolean {
  return id.startsWith("composedstory--") || id.endsWith("--unnamed-story");
}

/**
 * Record that a decorator recording stories is in place, see
 * {@link warnIfStoriesUndetected}.
 */
export function markRecorderInstalled(): void {
  (globalThis as Record<PropertyKey, unknown>)[RECORDER_INSTALLED] = true;
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
export function createRecordStoryDecorator(
  getCurrentTest: () => CurrentTask | undefined,
): StoryDecorator {
  // The test that first rendered each story context. A mounted story renders
  // again with the same context (a state update, a resize), possibly while a
  // later test runs: that test did not render it.
  const renderingTests = new WeakMap<object, string | null>();
  const decorator: StoryDecorator = (storyFn, context) => {
    if (isObject(context) && typeof context.id === "string") {
      const task = getCurrentTest();
      if (!renderingTests.has(context)) {
        renderingTests.set(context, task?.id ?? null);
      }
      if (task?.meta && renderingTests.get(context) === task.id) {
        const parameters = isObject(context.parameters)
          ? context.parameters
          : undefined;
        const story: RecordedStory = {
          id: context.id,
          tags: mergeTags(context.tags, parameters?.tags),
          play: hasPlay(context),
        };
        task.meta[RECORDED_STORY_META_KEY] = story;
      }
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
 * alike — and before any story is composed. It never throws: the setup file
 * runs before every test file of the project, and must not fail them.
 */
export async function installStoryRecorder(): Promise<void> {
  const getCurrentTest = await loadGetCurrentTest().catch(() => null);
  if (!getCurrentTest) {
    return;
  }
  const decorator = createRecordStoryDecorator(getCurrentTest);

  const addDecorator = (annotations: unknown): unknown => {
    if (!isObject(annotations) || !Array.isArray(annotations.decorators)) {
      return annotations;
    }
    if (
      !annotations.decorators.some(
        (existing: StoryDecorator) => existing?.[RECORD_STORY_DECORATOR],
      )
    ) {
      try {
        // Last, so it is the outermost project decorator and gets the story
        // context itself. Mutate rather than copy: Storybook marks the object
        // itself with non-enumerable symbols a copy would lose.
        annotations.decorators = [...annotations.decorators, decorator];
      } catch {
        // Frozen annotations: leave them alone rather than break Storybook.
        return annotations;
      }
    }
    markRecorderInstalled();
    return annotations;
  };

  const target = globalThis as Record<string, unknown>;
  let annotations = addDecorator(target[PROJECT_ANNOTATIONS_GLOBAL]);
  try {
    Object.defineProperty(target, PROJECT_ANNOTATIONS_GLOBAL, {
      configurable: true,
      enumerable: true,
      get: () => annotations,
      set: (value: unknown) => {
        annotations = addDecorator(value);
      },
    });
  } catch {
    // Already defined as non-configurable by something else.
  }
}

/**
 * Warn, once per test file, when screenshots of stories may go undetected:
 * Storybook's preview API is loaded, but no Argos decorator could be added to
 * its project annotations, because `setProjectAnnotations()` was never called
 * or Argos could not extend them.
 */
export function warnIfStoriesUndetected(): void {
  const target = globalThis as Record<PropertyKey, unknown>;
  if (
    !target[STORYBOOK_PREVIEW_GLOBAL] ||
    target[RECORDER_INSTALLED] ||
    target[UNDETECTED_WARNING_SHOWN]
  ) {
    return;
  }
  target[UNDETECTED_WARNING_SHOWN] = true;
  console.warn(
    "[@argos-ci/vitest] Storybook is loaded, but Argos cannot tell which " +
      "screenshots are of stories: they are reported as Vitest ones. Set " +
      "Storybook's project annotations with `setProjectAnnotations()` in a " +
      "setup file, or add `@argos-ci/vitest/storybook` to the annotations " +
      "you compose stories with.",
  );
}

/**
 * Get the Storybook context of a test, or `null` when it renders no story.
 */
export function getStorybookContext(
  task: CurrentTask,
): StorybookContext | null {
  const meta = task.meta ?? {};

  // `@storybook/addon-vitest` marks the tests it generates with the story id,
  // computed by the Storybook indexer, and puts the composed story (a function
  // carrying the story's fields) on the context. Require both: anyone can set
  // `task.meta`.
  const composedStory = task.context?.story;
  if (typeof meta.storyId === "string" && isComposedStory(composedStory)) {
    return {
      source: "addon-vitest",
      story: {
        id: meta.storyId,
        tags: mergeTags(composedStory.tags, composedStory.parameters?.tags),
        play: hasPlay(composedStory),
      },
    };
  }

  const recorded = meta[RECORDED_STORY_META_KEY];
  if (isRecordedStory(recorded)) {
    return {
      source: "portable-stories",
      story: checkIsPlaceholderId(recorded.id)
        ? null
        : { id: recorded.id, tags: recorded.tags, play: recorded.play },
    };
  }

  return null;
}
