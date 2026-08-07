import type { Plugin } from "vitest/config";
import { SLOW_IMAGE_URL } from "./slow-image";

/**
 * Delay before the image bytes are sent, long enough for the screenshot flow to
 * reach the point where it measures the content.
 */
const DELAY = 1500;

/** Solid magenta 300x300 PNG. */
const IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAMAAABOo35HAAAAA1BMVEX/AP804Oa6AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAbUlEQVR42u3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8G5gywABEMbFvQAAAABJRU5ErkJggg==";

/**
 * Serve an image that only responds after {@link DELAY}.
 *
 * Used to reproduce a layout that grows *after* the screenshot flow has
 * started: the `<img>` takes no space until it loads, so any content
 * measurement done before then underestimates the page height.
 */
export function slowImagePlugin(): Plugin {
  return {
    name: "argos-e2e:slow-image",
    configureServer(server) {
      const image = Buffer.from(IMAGE_BASE64, "base64");
      server.middlewares.use(SLOW_IMAGE_URL, (_req, res) => {
        setTimeout(() => {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "no-store");
          res.end(image);
        }, DELAY);
      });
    },
  };
}
