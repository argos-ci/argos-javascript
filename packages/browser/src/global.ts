import { waitForStability, prepareForScreenshot } from "./stabilization";

const ArgosGlobal = {
  waitForStability: () => waitForStability(document),
  prepareForScreenshot: () => prepareForScreenshot(document),
};

(window as any).__ARGOS__ = ArgosGlobal;

export type ArgosGlobal = typeof ArgosGlobal;
