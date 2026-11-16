import { getBrowserSuffix } from "@argos-ci/util";

/**
 * Name of a screenshot of a story. The mode and the browser are part of it, so
 * each mode and each browser gets its own baselines.
 *
 * @example
 *   getStoryScreenshotName({ name: "button--primary", mode: "dark", browserName: "firefox" })
 *   // => "button--primary mode-[dark] browser-[firefox]"
 */
export function getStoryScreenshotName(input: {
  /**
   * Base name of the screenshot, like the story id.
   */
  name: string;
  /**
   * Argos mode the screenshot is taken in, or `null` outside a mode.
   */
  mode: string | null;
  /**
   * Browser running the story, or `null` when it can't be identified.
   */
  browserName: string | null;
}): string {
  const { name, mode, browserName } = input;
  const modeSuffix = mode ? ` mode-[${mode}]` : "";
  return `${name}${modeSuffix}${getBrowserSuffix(browserName)}`;
}
