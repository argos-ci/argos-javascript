import type { ViewportSize } from "playwright";

export type StorybookGlobals = Record<string, any>;

export type FitToContent = {
  /**
   * Padding around the content in pixels.
   * @default 16
   */
  padding: number;

  /**
   * Zoom level for the content.
   * @default 2
   */
  zoom: number;
};

/**
 * Argos parameters in Storybook.
 */
export interface ArgosStorybookParameters {
  /**
   * Modes for the story.
   */
  modes?: Record<string, StorybookGlobals>;

  /**
   * Fit to content option for the story.
   */
  fitToContent?: boolean | Partial<FitToContent>;
}

export type StoryParameters = Record<string, any>;

/**
 * Get the default viewport size from the Storybook parameters.
 */
export function getDefaultViewport(
  parameters: StoryParameters,
): ViewportSize | null {
  const defaultViewport = parameters?.viewport?.defaultViewport;
  if (defaultViewport) {
    return getViewport(parameters, defaultViewport);
  }
  return null;
}

/**
 * Get the viewport size from the Storybook parameters.
 */
export function getViewport(
  parameters: StoryParameters,
  viewportName: string,
): ViewportSize | null {
  if (typeof viewportName === "number") {
    return { width: viewportName, height: 720 };
  }
  const viewports = parameters?.viewport?.viewports;
  if (viewports && viewportName in viewports) {
    if ("styles" in viewports[viewportName] && viewports[viewportName].styles) {
      const width = parseInt(viewports[viewportName].styles.width, 10);
      const height = parseInt(viewports[viewportName].styles.height, 10);
      if (!isNaN(width) && !isNaN(height)) {
        return { width, height };
      }
    }
  }
  return null;
}

/**
 * Get the Argos parameters from the Storybook context.
 */
export function getArgosParameters(
  parameters: StoryParameters,
): ArgosStorybookParameters | null {
  if (
    "argos" in parameters &&
    parameters.argos &&
    typeof parameters.argos === "object"
  ) {
    return parameters.argos;
  }
  // Also support chromatic parameters for backward compatibility.
  if (
    "chromatic" in parameters &&
    parameters.chromatic &&
    typeof parameters.chromatic === "object"
  ) {
    return parameters.chromatic;
  }

  return null;
}

const DEFAULT_FIT_TO_CONTENT: FitToContent = {
  padding: 16,
  zoom: 2,
};

export function getFitToContentFromParameters(
  parameters: StoryParameters,
): FitToContent | null {
  const argosParameters = getArgosParameters(parameters);
  if (argosParameters && "fitToContent" in argosParameters) {
    if (typeof argosParameters.fitToContent === "boolean") {
      return argosParameters.fitToContent ? DEFAULT_FIT_TO_CONTENT : null;
    }
    if (
      typeof argosParameters.fitToContent === "object" &&
      argosParameters.fitToContent
    ) {
      return {
        ...DEFAULT_FIT_TO_CONTENT,
        ...argosParameters.fitToContent,
      };
    }
  }
  return DEFAULT_FIT_TO_CONTENT;
}
