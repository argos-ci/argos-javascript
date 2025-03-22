import { plugins } from "./plugins";

type Cleanup = () => void;

export interface Plugin {
  /**
   * Name of the plugin.
   */
  name: string;
  /**
   * Run before taking all screenshots.
   */
  beforeAll?: (options: SetupOptions) => Cleanup | undefined;
  /**
   * Run before taking each screenshot (between viewport changes).
   */
  beforeEach?: (options: SetupOptions) => Cleanup | undefined;
  /**
   * Wait for a condition to be met before taking a screenshot.
   */
  wait?: {
    /**
     * Function to check if the condition is met.
     */
    for: (options: StabilizationOptions) => boolean;
    /**
     * Error message to display if the condition is not met.
     */
    failureExplanation: string;
  };
}

export interface SetupOptions {
  /**
   * Is the test running in full page mode?
   */
  fullPage?: boolean;

  /**
   * Custom CSS to apply to the page before taking a screenshot.
   */
  argosCSS?: string;
}

export interface StabilizationOptions {
  /**
   * Wait for [aria-busy="true"] elements to be invisible.
   * @default true
   */
  ariaBusy?: boolean;
  /**
   * Wait for images to be loaded.
   * @default true
   */
  images?: boolean;
  /**
   * Wait for fonts to be loaded.
   * @default true
   */
  fonts?: boolean;
}

const beforeAllCleanups = new Set<Cleanup>();
const beforeEachCleanups = new Set<Cleanup>();

/**
 * Run before taking all screenshots.
 */
export function beforeAll(options: SetupOptions = {}) {
  plugins.forEach((plugin) => {
    if (plugin.beforeAll) {
      const cleanup = plugin.beforeAll(options);
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
export function beforeEach(options: SetupOptions = {}) {
  plugins.forEach((plugin) => {
    if (plugin.beforeEach) {
      const cleanup = plugin.beforeEach(options);
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
function getStabilityState(options: StabilizationOptions) {
  const stabilityState: Record<string, boolean> = {};

  plugins.forEach((plugin) => {
    if (plugin.wait) {
      stabilityState[plugin.name] = plugin.wait.for(options);
    }
  });

  return stabilityState;
}

/**
 * Wait for a condition to be met before taking a screenshot.
 */
export function waitFor(options: StabilizationOptions) {
  const stabilityState = getStabilityState(options);
  return Object.values(stabilityState).every(Boolean);
}

/**
 * Get the error message to display if the condition is not met.
 */
export function getWaitFailureExplanations(options: StabilizationOptions) {
  const stabilityState = getStabilityState(options);
  const failedPlugins = Object.entries(stabilityState).filter(
    ([, value]) => !value,
  );

  return failedPlugins.map(([name]) => {
    const plugin = plugins.find((p) => p.name === name);
    if (!plugin?.wait) {
      throw new Error(`Invariant: plugin ${name} not found`);
    }
    return plugin.wait.failureExplanation;
  });
}
