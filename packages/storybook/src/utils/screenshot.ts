import {
  argosScreenshot as argosPlaywrightScreenshot,
  DO_NOT_USE_setMetadataConfig,
  type Attachment,
  type ArgosScreenshotOptions as BaseArgosScreenshotOptions,
  type MetadataConfig,
} from "@argos-ci/playwright";
import type { Frame, Page, ViewportSize } from "playwright";
import { getArgosStorybookVersion } from "./metadata";
import {
  getArgosParameters,
  getDefaultViewport,
  getViewport,
  type StorybookGlobals,
} from "./parameters";
import type { ComposedStoryFn } from "storybook/internal/types";

export type StorybookScreenshotContext<Handler extends Page | Frame> = {
  /**
   * - "manual" means the `argosScreenshot` has been called in the story play function.
   * - "automatic" means the screenshot is taken automatically after each test.
   */
  mode: "manual" | "automatic";
  name: string;
  playwrightLibraries: string[];
  test?: MetadataConfig["test"];
  setViewportSize: (size: ViewportSize | "default") => Promise<void>;
  beforeScreenshot?: (input: {
    handler: Handler;
    globals: StorybookGlobals;
  }) => Promise<void>;
  afterScreenshot?: (input: {
    handler: Handler;
    globals: StorybookGlobals;
  }) => Promise<void>;
  story: {
    id: string;
    parameters: Record<string, any>;
    globals: StorybookGlobals | null;
  };
};

export type ArgosScreenshotOptions = Omit<
  BaseArgosScreenshotOptions,
  "viewports"
>;

/**
 * Take a screenshot in the context of a Storybook story.
 */
export async function storybookArgosScreenshot<Handler extends Page | Frame>(
  /**
   * Playwright `handler` object.
   */
  handler: Handler,
  /**
   * Context of the story.
   */
  context: StorybookScreenshotContext<Handler>,
  /**
   * Options for the screenshot.
   */
  options?: ArgosScreenshotOptions,
) {
  const argosOptions = {
    ...options,
    // Disable aria-busy stabilization by default
    stabilize: options?.stabilize ?? {
      waitForAriaBusy: false,
      ...(typeof options?.stabilize === "object" ? options.stabilize : {}),
    },
  };

  const version = await getArgosStorybookVersion();
  const storyUrl = `http://localhost:6006/?path=/story/${context.story.id}`;

  const metadata: MetadataConfig = {
    sdk: { name: "@argos-ci/storybook", version },
    playwrightLibraries: context.playwrightLibraries,
    url: storyUrl,
    test: context.test,
  };

  const argosParameters = getArgosParameters(context.story.parameters);
  const modes = argosParameters?.modes;

  const allAttachments: Attachment[] = [];
  if (context.mode === "automatic") {
    if (modes) {
      for (const [name, globals] of Object.entries(modes)) {
        // Skip disabled modes.
        if (globals.disabled) {
          continue;
        }

        // Set the current mode global.
        await handler.evaluate((name) => {
          (globalThis as any).__ARGOS_CURRENT_MODE = name;
        }, name);

        // Take the screenshot and saves all attachments.
        const attachments = await runHooksAndScreenshot({
          handler,
          context,
          metadata,
          options: argosOptions,
          suffix: getModeSuffix(name),
          globals: {
            ...context.story.globals,
            ...globals,
          },
        });
        allAttachments.push(...attachments);

        // Reset viewport.
        await context.setViewportSize("default");

        // Reset the current mode global.
        await handler.evaluate(() => {
          delete (globalThis as any).__ARGOS_CURRENT_MODE;
        });
      }
    } else {
      const attachments = await runHooksAndScreenshot({
        handler,
        context,
        metadata,
        options: argosOptions,
        globals: context.story.globals ?? {},
      });
      allAttachments.push(...attachments);
    }
  } else if (context.mode === "manual") {
    const currentMode = await handler.evaluate(() => {
      return (
        ((globalThis as any).__ARGOS_CURRENT_MODE as string | undefined) || null
      );
    });
    // If there are modes defined in the parameters, but the currentMode is not set,
    // it means the screenshot was called outside of a mode, so we skip it.
    if (modes && !currentMode) {
      return;
    }
    // If we take a screenshot while in the play function, we need to mark the story as rendered
    // else the story will be marked as rendered too late.
    await markStoryAsRendered(handler, context.story.id);
    await argosPlaywrightScreenshot(
      handler,
      composeName(context.name, getModeSuffix(currentMode)),
      options,
    );
  }

  await context.afterScreenshot?.({ handler, globals: {} });

  return allAttachments;
}

type StorybookPreview = {
  channel: {
    emit: (event: string, data?: any) => void;
    last: (event: string) => any[];
  };
};

/**
 * Run the story with the given globals.
 */
async function runStory(args: {
  handler: Page | Frame;
  globals: StorybookGlobals;
  storyId: string;
}) {
  const { handler, globals, storyId } = args;
  // Re-run the story with the new globals.
  await handler.evaluate(async (globals) => {
    // If the composed story is exposed (in Vitest).
    if ("__ARGOS_STORYBOOK_STORY" in globalThis) {
      const storyFn = (globalThis as any)
        .__ARGOS_STORYBOOK_STORY as ComposedStoryFn;

      if (!storyFn) {
        throw new Error(
          "@argos-ci/storybook: Unable to find `__ARGOS_STORYBOOK_STORY`.",
        );
      }

      // Cleanup the previous canvasElement if any and create a new one.
      // We use "storybook-root", so plugins like pseudo-states can hook into it.
      const canvasElement = (() => {
        const existing = document.getElementById("storybook-root");
        existing?.remove();
        const canvasElement = document.createElement("div");
        canvasElement.id = "storybook-root";
        document.body.appendChild(canvasElement);
        return canvasElement;
      })();

      // Run the story again with the new globals.
      await storyFn.run({ globals, canvasElement });
      return;
    }

    // If we are here, we are not using Vitest, so we can use the channel to update globals.
    const channel = (() => {
      if ("__STORYBOOK_PREVIEW__" in globalThis) {
        return ((globalThis as any).__STORYBOOK_PREVIEW__ as StorybookPreview)
          .channel;
      }
      return null;
    })();

    if (!channel) {
      throw new Error(
        "@argos-ci/storybook: Unable to find `__STORYBOOK_PREVIEW__`.",
      );
    }

    // Get the initial globals and update them with the new ones.
    const initialGlobals = channel.last("globalsUpdated")?.[0].initialGlobals;
    channel.emit("updateGlobals", {
      globals: { ...initialGlobals, ...globals },
    });
  }, globals);

  await markStoryAsRendered(handler, storyId);
}

/**
 * Notify Storybook that the story has been rendered.
 * It will run all the necessary hooks (like pseudo-states).
 */
async function markStoryAsRendered<Handler extends Page | Frame>(
  /**
   * Playwright `handler` object.
   */
  handler: Handler,
  /**
   * Id of the story.
   */
  storyId: string,
) {
  await handler.evaluate((storyId) => {
    // Only in Vitest environment.
    if ("__ARGOS_STORYBOOK_STORY" in globalThis) {
      const addons = (globalThis as any).__STORYBOOK_ADDONS_PREVIEW as {
        getChannel: () => StorybookPreview["channel"];
      };
      if (!addons) {
        throw new Error(
          "@argos-ci/storybook: Unable to find `__STORYBOOK_ADDONS_PREVIEW`.",
        );
      }
      addons.getChannel().emit("storyRendered", storyId);
    }
  }, storyId);
}

/**
 * Wait for the page to be ready and take a screenshot.
 */
async function runHooksAndScreenshot<Handler extends Page | Frame>(args: {
  handler: Handler;
  context: StorybookScreenshotContext<Handler>;
  options: ArgosScreenshotOptions;
  globals: StorybookGlobals;
  suffix?: string;
  metadata: MetadataConfig;
}) {
  const { handler, context, options, globals, metadata } = args;

  await runStory({ handler, globals, storyId: context.story.id });

  // Get the viewport from globals set on the mode.
  const viewportFromGlobals = globals.viewport
    ? getViewport(context.story.parameters, globals.viewport)
    : null;

  const viewport =
    viewportFromGlobals ??
    getDefaultViewport(context.story.parameters) ??
    "default";

  await context.setViewportSize(viewport);

  DO_NOT_USE_setMetadataConfig({
    ...metadata,
    viewport: viewport && viewport !== "default" ? viewport : undefined,
  });

  await context.beforeScreenshot?.({ handler, globals });

  return argosPlaywrightScreenshot(
    handler,
    composeName(context.name, args.suffix),
    options,
  );
}

function getModeSuffix(mode: string | null) {
  return mode ? ` mode-[${mode}]` : "";
}

function composeName(name: string, suffix: string | undefined) {
  return name + (suffix ?? "");
}
