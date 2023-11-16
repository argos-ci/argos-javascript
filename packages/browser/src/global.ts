import {
  waitForStability,
  prepareForScreenshot,
  PrepareForScreenshotOptions,
} from "./stabilization";
import { getColorScheme, getMediaType } from "./media";

const ArgosGlobal = {
  waitForStability: () => waitForStability(document),
  prepareForScreenshot: (options: PrepareForScreenshotOptions = {}) =>
    prepareForScreenshot(document, options),
  getColorScheme: () => getColorScheme(window),
  getMediaType: () => getMediaType(window),
};

(window as any).__ARGOS__ = ArgosGlobal;

export type ArgosGlobal = typeof ArgosGlobal;
