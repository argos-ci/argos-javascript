import type { ViewportOption } from "../../viewport";
import { corePlugins, plugins, type PluginName } from "./plugins";

type Cleanup = () => void;

export interface Plugin {
  /**
   * Name of the plugin.
   */
  name: string;
  /**
   * When `true`, the plugin is disabled unless explicitly enabled through the
   * options (e.g. `{ [name]: true }`). Use it for plugins that are too
   * expensive to run by default.
   */
  optIn?: boolean;
  /**
   * Run before taking all screenshots.
   */
  beforeAll?: (
    context: RuntimeContext,
    options?: unknown,
  ) => Cleanup | undefined;
  /**
   * Run before taking each screenshot (between viewport changes).
   */
  beforeEach?: (
    context: RuntimeContext,
    options?: unknown,
  ) => Cleanup | undefined;
  /**
   * Wait for a condition to be met before taking a screenshot.
   */
  wait?: {
    /**
     * Function to check if the condition is met.
     */
    for: (context: RuntimeContext, options?: unknown) => boolean;
    /**
     * Error message to display if the condition is not met.
     */
    failureExplanation: string;
  };
}

export interface RuntimeContext {
  /**
   * Is the test running in full page mode?
   */
  fullPage?: boolean;

  /**
   * Viewports to use for the test.
   */
  viewports?: ViewportOption[];

  /**
   * Custom CSS to apply to the page before taking a screenshot.
   */
  argosCSS?: string;
}

/**
 * Options for the `waitForBackgroundImages` plugin.
 */
export interface WaitForBackgroundImagesOptions {
  /**
   * CSS selector scoping which elements are scanned for background images.
   * Scoping avoids a full-document `getComputedStyle` sweep on large pages.
   * @default "*"
   */
  selector?: string;
}

export type PluginOptions = {
  [key in Exclude<PluginName, "waitForBackgroundImages">]?: boolean;
} & {
  /**
   * Wait for CSS background images to be loaded.
   * Disabled by default. Enable with `true` to scan the whole document, or
   * pass an object to scope it to a selector.
   * @default false
   */
  waitForBackgroundImages?: boolean | WaitForBackgroundImagesOptions;
};

export interface Context extends RuntimeContext {
  options?: PluginOptions | boolean;
}

const beforeAllCleanups = new Set<Cleanup>();
const beforeEachCleanups = new Set<Cleanup>();

/**
 * Get the option value passed for a specific plugin.
 */
function getPluginOptions(context: Context, name: string): unknown {
  if (typeof context.options === "object" && context.options) {
    return (context.options as Record<string, unknown>)[name];
  }
  return undefined;
}

/**
 * Get the list of plugins to run based on the options.
 */
function getPlugins(context: Context): Plugin[] {
  const enabledPlugins = plugins.filter((plugin) => {
    if (context.options === false) {
      return false;
    }
    const pluginOptions = getPluginOptions(context, plugin.name);
    if ((plugin as Plugin).optIn) {
      // Opt-in plugins stay disabled unless explicitly enabled.
      return Boolean(pluginOptions);
    }
    if (pluginOptions === false) {
      return false;
    }
    return true;
  });

  return [...corePlugins, ...enabledPlugins];
}

function getPluginByName(name: string): Plugin {
  const plugin = plugins.find((p) => p.name === name);
  if (!plugin) {
    throw new Error(`Invariant: plugin ${name} not found`);
  }
  return plugin;
}

/**
 * Run before taking all screenshots.
 */
export function beforeAll(context: Context = {}) {
  getPlugins(context).forEach((plugin) => {
    if (plugin.beforeAll) {
      const cleanup = plugin.beforeAll(
        context,
        getPluginOptions(context, plugin.name),
      );
      if (cleanup) {
        beforeAllCleanups.add(cleanup);
      }
    }
  });
}

/**
 * Run after taking all screenshots.
 */
export function afterAll() {
  beforeAllCleanups.forEach((cleanup) => {
    cleanup();
  });
  beforeAllCleanups.clear();
}

/**
 * Run before taking each screenshot (between viewport changes).
 */
export function beforeEach(context: Context = {}) {
  getPlugins(context).forEach((plugin) => {
    if (plugin.beforeEach) {
      const cleanup = plugin.beforeEach(
        context,
        getPluginOptions(context, plugin.name),
      );
      if (cleanup) {
        beforeEachCleanups.add(cleanup);
      }
    }
  });
}

/**
 * Run after taking each screenshot (between viewport changes).
 */
export function afterEach() {
  beforeEachCleanups.forEach((cleanup) => {
    cleanup();
  });
  beforeEachCleanups.clear();
}

/**
 * Get the stabilization state of the document.
 */
function getStabilityState(context: Context) {
  const stabilityState: Record<string, boolean> = {};

  getPlugins(context).forEach((plugin) => {
    if (plugin.wait) {
      stabilityState[plugin.name] = plugin.wait.for(
        context,
        getPluginOptions(context, plugin.name),
      );
    }
  });

  return stabilityState;
}

/**
 * Wait for a condition to be met before taking a screenshot.
 */
export function waitFor(context: Context) {
  const stabilityState = getStabilityState(context);
  return Object.values(stabilityState).every(Boolean);
}

/**
 * Get the error message to display if the condition is not met.
 */
export function getWaitFailureExplanations(options: Context) {
  const stabilityState = getStabilityState(options);
  const failedPlugins = Object.entries(stabilityState).filter(
    ([, value]) => !value,
  );

  return failedPlugins.map(([name]) => {
    const plugin = getPluginByName(name);
    if (!plugin.wait) {
      throw new Error(
        `Invariant: plugin ${name} does not have a wait function`,
      );
    }
    return plugin.wait.failureExplanation;
  });
}
