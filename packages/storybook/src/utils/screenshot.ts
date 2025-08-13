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

export type StorybookScreenshotContext<Handler extends Page | Frame> = {
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
  if (modes) {
    for (const [name, globals] of Object.entries(modes)) {
      // Skip disabled modes.
      if (globals.disabled) {
        continue;
      }

      const attachments = await runHooksAndScreenshot({
        handler,
        context,
        metadata,
        options: argosOptions,
        suffix: ` mode-[${name}]`,
        globals: {
          ...context.story.globals,
          ...globals,
        },
      });
      allAttachments.push(...attachments);
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

  await context.setViewportSize("default");

  await setStorybookGlobals({ handler, globals: {} });

  if (context.afterScreenshot) {
    await context.afterScreenshot({
      handler,
      globals: {},
    });
  }

  return allAttachments;
}

type StorybookPreview = {
  channel: {
    emit: (event: string, data?: any) => void;
    last: (event: string) => any[];
  };
};

/**
 * Set the Storybook globals.
 */
async function setStorybookGlobals(args: {
  handler: Page | Frame;
  globals: StorybookGlobals;
}) {
  const { handler, globals } = args;
  await handler.evaluate((globals) => {
    const channel = (() => {
      if ("__STORYBOOK_PREVIEW__" in globalThis) {
        return ((globalThis as any).__STORYBOOK_PREVIEW__ as StorybookPreview)
          .channel;
      }
      if ("__STORYBOOK_ADDONS_CHANNEL__" in globalThis) {
        return (globalThis as any)
          .__STORYBOOK_ADDONS_CHANNEL__ as StorybookPreview["channel"];
      }
      return null;
    })();

    if (!channel) {
      throw new Error(
        "@argos-ci/storybook: Unable to find Storybook preview instance.",
      );
    }

    const initialGlobals = channel.last("globalsUpdated")?.[0].initialGlobals;

    channel.emit("updateGlobals", {
      globals: { ...initialGlobals, ...globals },
    });
  }, globals);
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

  await setStorybookGlobals({ handler, globals });

  if (context.beforeScreenshot) {
    await context.beforeScreenshot({
      handler,
      globals,
    });
  }

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

  return argosPlaywrightScreenshot(
    handler,
    context.name + (args.suffix ?? ""),
    options,
  );
}
