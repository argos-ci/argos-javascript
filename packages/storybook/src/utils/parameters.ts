import type { ViewportSize } from "playwright";

export type StorybookGlobals = Record<string, any>;

/**
 * Value of the Storybook `viewport` global.
 *
 * Storybook 9+ stores it as `{ value, isRotated }`. Argos modes and older
 * Storybook versions use the bare viewport name; a number is used as a width.
 */
export type StorybookViewportGlobal =
  | string
  | number
  | { value?: string | number | null; isRotated?: boolean }
  | null
  | undefined;

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

type ViewportDefinitions = Record<
  string,
  { styles?: { width?: string; height?: string } | null } | undefined
>;

/**
 * Get the viewports defined in the Storybook `viewport` parameter.
 * Storybook 9+ lists them under `options`, older versions under `viewports`.
 */
function getViewportDefinitions(
  parameters: StoryParameters,
): ViewportDefinitions | null {
  const viewport = parameters?.viewport;
  if (!viewport || typeof viewport !== "object") {
    return null;
  }
  const definitions = viewport.options ?? viewport.viewports;
  return definitions && typeof definitions === "object" ? definitions : null;
}

/**
 * Get the default viewport size from the Storybook parameters.
 *
 * `viewport.defaultViewport` (and `defaultOrientation`) were replaced by the
 * `viewport` global in Storybook 9 and removed in Storybook 10. The global is
 * resolved with `getViewport`; this only covers the legacy parameter.
 */
export function getDefaultViewport(
  parameters: StoryParameters,
): ViewportSize | null {
  const defaultViewport = parameters?.viewport?.defaultViewport;
  if (defaultViewport) {
    return getViewport(parameters, {
      value: defaultViewport,
      isRotated: parameters.viewport.defaultOrientation === "landscape",
    });
  }
  return null;
}

/**
 * Get the viewport size matching a `viewport` global.
 */
export function getViewport(
  parameters: StoryParameters,
  viewport: StorybookViewportGlobal,
): ViewportSize | null {
  const { value, isRotated } =
    viewport && typeof viewport === "object"
      ? {
          value: viewport.value ?? null,
          isRotated: Boolean(viewport.isRotated),
        }
      : { value: viewport ?? null, isRotated: false };

  if (typeof value === "number") {
    return { width: value, height: 720 };
  }
  if (!value) {
    return null;
  }
  const styles = getViewportDefinitions(parameters)?.[value]?.styles;
  if (!styles) {
    return null;
  }
  const width = parseInt(String(styles.width), 10);
  const height = parseInt(String(styles.height), 10);
  if (isNaN(width) || isNaN(height)) {
    return null;
  }
  return isRotated ? { width: height, height: width } : { width, height };
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
