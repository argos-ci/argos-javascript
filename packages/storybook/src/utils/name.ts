/**
 * Browser whose screenshots keep the plain story name. It is the default of
 * every Storybook runner, so existing baselines stay valid when another browser
 * is added to the run.
 */
const DEFAULT_BROWSER = "chromium";

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
   * Browser running the story, like `chromium` or `firefox`, or `null` when it
   * can't be identified.
   */
  browserName: string | null;
}): string {
  const { name, mode, browserName } = input;
  let result = name;
  if (mode) {
    result += ` mode-[${mode}]`;
  }
  if (browserName && browserName !== DEFAULT_BROWSER) {
    result += ` browser-[${browserName}]`;
  }
  return result;
}
