import {
  checkIsStable,
  setup,
  teardown,
  SetupOptions,
  TeardownOptions,
  StabilizationOptions,
  getStabilityFailureReasons,
} from "./stabilization";
import { getColorScheme, getMediaType } from "./media";

const ArgosGlobal = {
  checkIsStable: (options?: StabilizationOptions) =>
    checkIsStable(document, options),
  getStabilityFailureReasons: (options?: StabilizationOptions) =>
    getStabilityFailureReasons(document, options),
  setup: (options: SetupOptions = {}) => setup(document, options),
  teardown: (options: TeardownOptions = {}) => teardown(document, options),
  getColorScheme: () => getColorScheme(window),
  getMediaType: () => getMediaType(window),
};

(window as any).__ARGOS__ = ArgosGlobal;

export type ArgosGlobal = typeof ArgosGlobal;
