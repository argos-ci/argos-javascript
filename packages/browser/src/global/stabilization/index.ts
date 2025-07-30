import type { ViewportOption } from "../../viewport";
import { corePlugins, plugins, type PluginName } from "./plugins";

type Cleanup = () => void;

export interface Plugin {
  /**
   * Name of the plugin.
   */
  name: string;
  /**
   * Run before taking all screenshots.
   */
  beforeAll?: (context: RuntimeContext) => Cleanup | undefined;
  /**
   * Run before taking each screenshot (between viewport changes).
   */
  beforeEach?: (context: RuntimeContext) => Cleanup | undefined;
  /**
   * Wait for a condition to be met before taking a screenshot.
   */
  wait?: {
    /**
     * Function to check if the condition is met.
     */
    for: (context: RuntimeContext) => boolean;
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

export type PluginOptions = {
  [key in PluginName]?: boolean;
};

export interface Context extends RuntimeContext {
  options?: PluginOptions | boolean;
}

const beforeAllCleanups = new Set<Cleanup>();
const beforeEachCleanups = new Set<Cleanup>();

/**
 * Get the list of plugins to run based on the options.
 */
function getPlugins(context: Context): Plugin[] {
  const enabledPlugins = plugins.filter((plugin) => {
    if (context.options === false) {
      return false;
    }
    if (typeof context.options === "object") {
      const pluginEnabled = context.options[plugin.name];
      if (pluginEnabled === false) {
        return false;
      }
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
      const cleanup = plugin.beforeAll(context);
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
      const cleanup = plugin.beforeEach(context);
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
      stabilityState[plugin.name] = plugin.wait.for(context);
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
