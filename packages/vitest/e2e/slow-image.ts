/**
 * URL of the intentionally slow image served by `slowImagePlugin`.
 *
 * Kept apart from the plugin so the browser tests can import it without pulling
 * in the Node-only plugin code.
 */
export const SLOW_IMAGE_URL = "/__argos_slow_image.png";
