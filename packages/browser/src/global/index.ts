import {
  waitForStability,
  setup,
  teardown,
  SetupOptions,
  TeardownOptions,
} from "./stabilization";
import { getColorScheme, getMediaType } from "./media";

const ArgosGlobal = {
  waitForStability: () => waitForStability(document),
  setup: (options: SetupOptions = {}) => setup(document, options),
  teardown: (options: TeardownOptions = {}) => teardown(document, options),
  getColorScheme: () => getColorScheme(window),
  getMediaType: () => getMediaType(window),
};

(window as any).__ARGOS__ = ArgosGlobal;

export type ArgosGlobal = typeof ArgosGlobal;
