import {
  waitForStability,
  setup,
  teardown,
  PrepareForScreenshotOptions,
} from "./stabilization";
import { getColorScheme, getMediaType } from "./media";

const ArgosGlobal = {
  waitForStability: () => waitForStability(document),
  setup: (options: PrepareForScreenshotOptions = {}) =>
    setup(document, options),
  teardown: (options: PrepareForScreenshotOptions = {}) =>
    teardown(document, options),
  getColorScheme: () => getColorScheme(window),
  getMediaType: () => getMediaType(window),
};

(window as any).__ARGOS__ = ArgosGlobal;

export type ArgosGlobal = typeof ArgosGlobal;
