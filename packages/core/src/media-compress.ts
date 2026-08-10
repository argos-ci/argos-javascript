import { open, stat } from "node:fs/promises";
import sharp from "sharp";
import tmp from "tmp";
import { debug } from "./debug";

/**
 * Content types converted to WebP before upload.
 *
 * PNG and JPEG only. `image/webp` is already there; `image/avif` compresses
 * better than WebP, so converting it would make the file bigger; `image/gif` may
 * be animated, and an animated image is the one case where re-encoding risks
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
 * Most pixels worth decoding, matching the screenshot pipeline's own budget.
 *
 * The per-side limit above is not a bound on work: 16383x16383 clears it and is
 * 268 million pixels, over a gigabyte of raw RGBA before anything is encoded,
 * which is enough to take a CI container down over one upload.
 */
const MAX_PIXELS = 80_000_000;

/**
 * Quality passed to the WebP encoder.
 *
 * 85 rather than sharp's default 80: these files are looked at by a human
 * judging a UI, so text and 1px borders have to survive. It still lands an order
 * of magnitude under the source PNG.
 */
const WEBP_QUALITY = 85;

/**
 * How much of a PNG's head to read looking for an animation control chunk. `acTL`
 * has to precede the first `IDAT`, and the chunks before it are a fixed handful,
 * so it is always inside the first few hundred bytes.
 */
const PNG_HEAD_BYTES = 4096;

export type MediaSource = {
  /** Path of the file to upload — the converted one when conversion happened. */
  path: string;
  /** Content type of the bytes at {@link MediaSource.path}. */
  contentType: string;
};

export type CompressedMedia = {
  /** What to upload. The original, when converting would not have helped. */
  source: MediaSource;
  /**
   * Removes the temporary file, if one was written. Always safe to call, and must
   * be called once the bytes have been uploaded.
   */
  cleanup: () => void;
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
 * converting would not help or cannot be done: a video, an already-efficient
 * format, an animated image, an image too large for the encoder, bytes that came
 * out no smaller, or any failure along the way. Compression is an optimization,
 * so a file Argos could have uploaded as-is must not be turned into a failed
 * upload by it. The caller uploads whatever comes back.
 */
export async function compressMediaToWebp(
  source: MediaSource,
): Promise<CompressedMedia> {
  const keepOriginal: CompressedMedia = { source, cleanup: () => {} };

  if (!COMPRESSIBLE_CONTENT_TYPES.has(source.contentType)) {
    debug(
      `Not compressing ${source.path}: ${source.contentType} is left as-is`,
    );
    return keepOriginal;
  }

  let temporary: { path: string; remove: () => void } | null = null;

  try {
    if (await checkIsAnimatedPng(source)) {
      // sharp reads the first frame only, so converting would upload a still
      // image of something the caller recorded because it moves.
      debug(`Not compressing ${source.path}: animated PNG`);
      return keepOriginal;
    }

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
      return keepOriginal;
    }

    if (width && height && width * height > MAX_PIXELS) {
      debug(
        `Not compressing ${source.path}: ${width * height} pixels exceeds the ${MAX_PIXELS} budget`,
      );
      return keepOriginal;
    }

    temporary = await createTemporaryFile();

    // `rotate()` with no argument applies the EXIF orientation before the
    // metadata carrying it is dropped. Without it, a photo or a mobile capture
    // that every viewer shows upright would upload on its side.
    const { size } = await sharp(source.path)
      .rotate()
      .webp({ quality: WEBP_QUALITY })
      .toFile(temporary.path);

    // Already-optimized or very small images can come out bigger. Uploading the
    // original then costs nothing and keeps the better file.
    if (size >= originalStats.size) {
      debug(
        `Not compressing ${source.path}: WebP is larger (${size} >= ${originalStats.size} bytes)`,
      );
      temporary.remove();
      return keepOriginal;
    }

    debug(
      `Compressed ${source.path} to WebP: ${originalStats.size} → ${size} bytes`,
    );
    const converted = temporary;
    return {
      source: { path: converted.path, contentType: "image/webp" },
      cleanup: converted.remove,
    };
  } catch (error) {
    // Not fatal: a corrupt-but-serveable file, an unwritable temp directory or a
    // format sharp declines are all reasons to send the original rather than to
    // refuse an upload that would have worked without compression.
    const message = error instanceof Error ? error.message : "Unknown Error";
    debug(`Not compressing ${source.path}: ${message}`);
    temporary?.remove();
    return keepOriginal;
  }
}

/**
 * Create a temporary file and keep the callback that deletes it.
 *
 * Not `promisify(tmp.file)`: that resolves with the path alone and drops both the
 * open descriptor and the remove callback, which leaks one of each per file —
 * `tmp` only cleans up at exit when `setGracefulCleanup()` was called, and even
 * then it would hold every file for the whole run.
 */
function createTemporaryFile(): Promise<{ path: string; remove: () => void }> {
  return new Promise((resolve, reject) => {
    tmp.file(
      { prefix: "argos-media-", postfix: ".webp", discardDescriptor: true },
      (error, path, _fd, removeCallback) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({
          path,
          remove: () => {
            try {
              removeCallback();
            } catch {
              // Already gone, or never written. Nothing to report.
            }
          },
        });
      },
    );
  });
}

/**
 * Whether a PNG carries an `acTL` chunk, which makes it an APNG.
 *
 * Read off the bytes rather than from sharp: libvips reports no page count for an
 * APNG, so `metadata.pages` cannot tell an animation from a still image here.
 */
async function checkIsAnimatedPng(source: MediaSource): Promise<boolean> {
  if (source.contentType !== "image/png") {
    return false;
  }

  const file = await open(source.path);
  try {
    const { buffer, bytesRead } = await file.read({
      buffer: Buffer.alloc(PNG_HEAD_BYTES),
    });
    return buffer.subarray(0, bytesRead).includes("acTL", 0, "ascii");
  } finally {
    await file.close();
  }
}
