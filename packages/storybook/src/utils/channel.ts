import { addons } from "storybook/preview-api";
import { Channel } from "storybook/internal/channels";

/**
 * Make sure a single, shared Storybook channel exists in the preview.
 *
 * Portable stories (Vitest) run without the Storybook preview runtime, so
 * nothing installs a channel. Addons still grab one at import time with
 * `addons.getChannel()`, and Argos emits `storyRendered` on it so addons that
 * only react to channel events — `storybook-addon-pseudo-states`, which
 * rewrites `:hover` rules into `.pseudo-hover` ones — do their work before the
 * screenshot is taken.
 *
 * Up to Storybook 10.4, `getChannel()` lazily created a mock channel and cached
 * it, so every caller shared the same object and the emit was received. Since
 * 10.5 it returns a *throwaway* mock channel on each call unless a channel has
 * been installed, so listeners and emitters end up on different objects and the
 * event goes nowhere. Installing a real channel restores a single instance on
 * both versions.
 *
 * This has to run before any addon captures its channel, hence its own setup
 * file, registered ahead of the user's.
 */
export function setupArgosChannel() {
  if (addons.hasChannel()) {
    return;
  }
  // A transport-less channel: nothing is sent anywhere, it only dispatches
  // events between the preview-side listeners.
  addons.setChannel(new Channel({}));
}
