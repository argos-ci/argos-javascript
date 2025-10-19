import { promisify } from "node:util";
import { basename } from "node:path";
import sharp from "sharp";
import tmp from "tmp";
import { checkIsValidImageFile } from "./discovery";

export type ImageFormat = keyof sharp.FormatEnum;

const tmpFile = promisify<string>(tmp.file);

/**
 * Maximum number of pixels allowed in a screenshot.
 */
const MAX_PIXELS = 80_000_000;

/**
 * Default maximum width of a screenshot.
 * Used when the width or height of the image is not available.
 */
const DEFAULT_MAX_WIDTH = 2048;

export async function optimizeScreenshot(filepath: string): Promise<string> {
  if (!checkIsValidImageFile(filepath)) {
    return filepath;
  }

  try {
    const [resultFilePath, metadata] = await Promise.all([
      tmpFile(),
      sharp(filepath).metadata(),
    ]);

    const { width, height } = metadata;
    const maxDimensions = (() => {
      // If there is no width or height, we will use the default maximum width.
      if (!width || !height) {
        return {
          width: DEFAULT_MAX_WIDTH,
          height: Math.floor(MAX_PIXELS / DEFAULT_MAX_WIDTH),
        };
      }

      const nbPixels = width * height;
      if (nbPixels <= MAX_PIXELS) {
        return null;
      }

      // If the orientation is portrait, we will use the default maximum width.
      if (width < height) {
        return {
          width: DEFAULT_MAX_WIDTH,
          height: Math.floor(MAX_PIXELS / DEFAULT_MAX_WIDTH),
        };
      }

      // If the orientation is landscape, we will compute a new ratio.
      const scaleFactor = Math.sqrt(MAX_PIXELS / nbPixels);
      return {
        width: Math.floor(width * scaleFactor),
        height: Math.floor(height * scaleFactor),
      };
    })();

    let operation = sharp(filepath);
    if (maxDimensions) {
      operation = operation.resize(maxDimensions.width, maxDimensions.height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    await operation.png({ force: true }).toFile(resultFilePath);

    // Warn if the image was resized
    if (width && height && maxDimensions) {
      const { width: maxWidth, height: maxHeight } = maxDimensions;
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const scaleFactor = Math.min(widthRatio, heightRatio);

      const newWidth = Math.floor(width * scaleFactor);
      const newHeight = Math.floor(height * scaleFactor);

      console.warn(
        `Image ${basename(filepath)} resized from ${width}x${height} to ${newWidth}x${newHeight}.`,
      );
    }

    return resultFilePath;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Error";
    throw new Error(`Error while processing image (${filepath}): ${message}`, {
      cause: error,
    });
  }
}
