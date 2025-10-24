import type * as vitest from "vitest";
import type { ComposedStoryFn } from "storybook/internal/types";
import type { ArgosScreenshotOptions } from "./utils/screenshot";
import type { ArgosScreenshotCommandArgs } from "./vitest-plugin";
import type { Attachment } from "@argos-ci/playwright";
import type { StorybookGlobals } from "./utils/parameters";

export type { ArgosScreenshotOptions };

declare module "vitest/browser" {
  interface BrowserCommands {
    argosScreenshot: (
      ...args: ArgosScreenshotCommandArgs
    ) => Promise<Attachment[]>;
  }
}

/**
 * Setup Argos hooks for Vitest.
 */
export function setupArgos(api: { afterEach: typeof vitest.afterEach }) {
  api.afterEach(async (ctx) => {
    // In Vitest, the context contains the story when using @storybook/addon-vitest
    const story = "story" in ctx ? (ctx.story as ComposedStoryFn) : null;

    if (!story) {
      throw new Error(
        `@argos-ci/storybook/vitest-plugin should be used with @storybook/addon-vitest/vitest-plugin`,
      );
    }

    // Load vitest/browser using dynamic import to avoid loading it in non-Vitest environments.
    const { server } = await import("@vitest/browser/context");

    // Expose the Story as global to be able to re-render it.
    (globalThis as any).__ARGOS_STORYBOOK_STORY = story;

    // Take the screenshot.
    await server.commands.argosScreenshot({
      mode: "automatic",
      name: story.id,
      story: {
        id: story.id,
        parameters: story.parameters,
        globals: story.globals,
      },
      test: {
        id: ctx.task.id,
        title: ctx.task.name,
        titlePath: [ctx.task.file.name, ctx.task.name],
        location: {
          line: ctx.task.location?.line ?? 1,
          column: ctx.task.location?.column ?? 1,
          file: ctx.task.file.filepath,
        },
      },
    });
  });
}

/**
 * Take an Argos screenshot of a story in Vitest.
 */
export async function argosScreenshot(
  story: {
    parameters: Record<string, any>;
    globals: StorybookGlobals | null;
    id: string;
  },
  name: string,
) {
  // Only run in Vitest.
  const isVitest = await checkIsVitestEnv();
  if (!isVitest) {
    return;
  }

  // Load vitest/browser using dynamic import to avoid loading it in non-Vitest environments.
  const { server } = await import("@vitest/browser/context");
  await server.commands.argosScreenshot({
    mode: "manual",
    name: `${story.id}/${name}`,
    story: {
      id: story.id,
      parameters: story.parameters,
      globals: story.globals,
    },
  });
}

/**
 * Check if we are running in a Vitest environment.
 */
async function checkIsVitestEnv(): Promise<boolean> {
  try {
    await import("@vitest/browser/context");
    return true;
  } catch {
    return false;
  }
}
