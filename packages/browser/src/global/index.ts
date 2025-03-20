import type {
  SetupOptions,
  TeardownOptions,
  StabilizationOptions,
} from "./stabilization";
import {
  checkIsStable,
  setup,
  teardown,
  getStabilityFailureReasons,
} from "./stabilization";
import { getColorScheme, getMediaType } from "./media";

const ArgosGlobal = {
  checkIsStable: (options?: StabilizationOptions) =>
    checkIsStable(document, options),
  getStabilityFailureReasons: (options?: StabilizationOptions) =>
    getStabilityFailureReasons(document, options),
  afterEach: () => teardown(document),
  setup: (options: SetupOptions = {}) => setup(document, options),
  teardown: (options: TeardownOptions = {}) => teardown(document, options),
  getColorScheme: () => getColorScheme(window),
  getMediaType: () => getMediaType(window),
};

(window as any).__ARGOS__ = ArgosGlobal;

export type ArgosGlobal = typeof ArgosGlobal;
