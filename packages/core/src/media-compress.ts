import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import sharp from "sharp";
import tmp from "tmp";
import { debug } from "./debug";

const tmpFile = promisify<string>(tmp.file);

/**
 * Content types converted to WebP before upload.
 *
 * PNG and JPEG only. `image/webp` is already there; `image/avif` compresses
 * better than WebP, so converting it would make the file bigger; `image/gif` may
 * be animated, and an animated GIF is the one case where re-encoding risks
 * dropping frames rather than saving bytes.
 */
const COMPRESSIBLE_CONTENT_TYPES = new Set(["image/png", "image/jpeg"]);

/**
 * Longest side WebP can encode. A full-page screenshot goes past it more often
 * than you would think — 1440 wide by 20000 tall is an ordinary "capture the
 * whole scroll" result — and sharp throws rather than clamping.
 */
const WEBP_MAX_DIMENSION = 16383;

/**
 * Quality passed to the WebP encoder.
 *
 * 85 rather than sharp's default 80: these files are looked at by a human
 * judging a UI, so text and 1px borders have to survive. It still lands an order
 * of magnitude under the source PNG.
 */
const WEBP_QUALITY = 85;

export type MediaSource = {
  /** Path of the file to upload — the converted one when conversion happened. */
  path: string;
  /** Content type of the bytes at {@link MediaSource.path}. */
  contentType: string;
};

/**
 * Convert an image to WebP in a temporary file, and hand back what to upload.
 *
 * Screenshots are the bulk of what gets uploaded here and PNG is the worst
 * possible container for them: a 1440x900 UI capture is routinely 1–2 MB as PNG
 * and under 100 KB as WebP. That is the difference between an upload an agent
 * waits on and one it does not, and it is what keeps a long screen recording's
 * companion screenshots inside the plan's file size limit.
 *
 * Returns the original file untouched — same path, same content type — whenever
 * converting would not help: a video, an already-efficient format, an image too
 * large for the WebP encoder, or bytes that came out no smaller than they went
 * in. The caller uploads whatever comes back and does not need to know which
 * happened.
 */
export async function compressMediaToWebp(
  source: MediaSource,
): Promise<MediaSource> {
  if (!COMPRESSIBLE_CONTENT_TYPES.has(source.contentType)) {
    debug(
      `Not compressing ${source.path}: ${source.contentType} is left as-is`,
    );
    return source;
  }

  try {
    const [metadata, originalStats] = await Promise.all([
      sharp(source.path).metadata(),
      stat(source.path),
    ]);

    const { width, height } = metadata;
    if (
      (width && width > WEBP_MAX_DIMENSION) ||
      (height && height > WEBP_MAX_DIMENSION)
    ) {
      debug(
        `Not compressing ${source.path}: ${width}x${height} exceeds WebP's ${WEBP_MAX_DIMENSION}px limit`,
      );
      return source;
    }

    const target = await tmpFile();
    // `rotate()` with no argument applies the EXIF orientation before the
    // metadata carrying it is dropped. Without it, a photo or a mobile capture
    // that every viewer shows upright would upload on its side.
    const { size } = await sharp(source.path)
      .rotate()
      .webp({ quality: WEBP_QUALITY })
      .toFile(target);

    // Already-optimized or very small images can come out bigger. Uploading the
    // original then costs nothing and keeps the better file.
    if (size >= originalStats.size) {
      debug(
        `Not compressing ${source.path}: WebP is larger (${size} >= ${originalStats.size} bytes)`,
      );
      return source;
    }

    debug(
      `Compressed ${source.path} to WebP: ${originalStats.size} → ${size} bytes`,
    );
    return { path: target, contentType: "image/webp" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Error";
    throw new Error(
      `Error while compressing image (${source.path}): ${message}`,
      { cause: error },
    );
  }
}
