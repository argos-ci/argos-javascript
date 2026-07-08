/**
 * Internal, unstable entry point shared with other Argos SDKs (e.g.
 * `@argos-ci/storybook`). No semver guarantee — do not import directly.
 */
export {
  resetTesterScale,
  setIframeViewportSize,
  fitIframeToContent,
  VITEST_IFRAME_SELECTOR,
  VITEST_TESTER_ID,
} from "./iframe";
export { screenshotFrame } from "./screenshot";
export { getArgosVitestVersion } from "./version";
