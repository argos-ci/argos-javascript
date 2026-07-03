import type { Plugin } from "..";

const BACKUP_ATTRIBUTE = "data-argos-gif-src";

/**
 * GIFs currently being frozen for this screenshot cycle.
 * Freezing is asynchronous (we load a fresh copy to grab its first frame), so
 * `wait.for` polls this set to keep stabilization blocked until every GIF has
 * been paused.
 */
const pendingFreezes = new Set<HTMLImageElement>();

/**
 * Detect animated GIFs from their resolved source. There is no cheap way to
 * inspect the decoded bytes, so we rely on the URL (file extension or the
 * `data:image/gif` MIME type).
 */
function isGif(img: HTMLImageElement): boolean {
  const src = img.currentSrc || img.src;
  return /^data:image\/gif[;,]/i.test(src) || /\.gif(?:$|[?#])/i.test(src);
}

/**
 * Pause animated GIFs by replacing them with a static snapshot of their first
 * frame. A playing GIF renders a non-deterministic frame depending on when the
 * screenshot is taken, which causes flaky visual diffs.
 *
 * The current frame of an already-rendered `<img>` is unpredictable (it has
 * been animating since it loaded), so we load a fresh copy of the image and
 * draw it to a canvas the moment it decodes — that always yields the first
 * frame — then swap the frozen data URL back into the original element.
 */
export const plugin = {
  name: "pauseGifs" as const,
  beforeEach() {
    Array.from(document.images).forEach((img) => {
      // Skip images we already froze during this pass.
      if (img.hasAttribute(BACKUP_ATTRIBUTE) || !isGif(img)) {
        return;
      }

      const originalSrc = img.src;
      const frame = new Image();
      // Request CORS so cross-origin GIFs served with the right headers can be
      // drawn without tainting the canvas.
      frame.crossOrigin = "anonymous";

      pendingFreezes.add(img);
      const done = () => {
        pendingFreezes.delete(img);
      };

      frame.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = frame.naturalWidth;
        canvas.height = frame.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx || canvas.width === 0 || canvas.height === 0) {
          done();
          return;
        }

        ctx.drawImage(frame, 0, 0);

        try {
          const frozenSrc = canvas.toDataURL("image/png");
          img.setAttribute(BACKUP_ATTRIBUTE, originalSrc);
          img.src = frozenSrc;
        } catch {
          // Cross-origin GIFs without CORS headers taint the canvas and make
          // `toDataURL` throw; leave those animating rather than fail.
        }

        done();
      };

      // Never block stabilization on a GIF that fails to load.
      frame.onerror = done;

      frame.src = originalSrc;
    });

    return () => {
      pendingFreezes.clear();
      Array.from(document.images).forEach((img) => {
        const originalSrc = img.getAttribute(BACKUP_ATTRIBUTE);
        if (originalSrc === null) {
          return;
        }
        img.src = originalSrc;
        img.removeAttribute(BACKUP_ATTRIBUTE);
      });
    };
  },
  wait: {
    for: () => pendingFreezes.size === 0,
    failureExplanation: "Some GIFs are still being paused",
  },
} satisfies Plugin;
