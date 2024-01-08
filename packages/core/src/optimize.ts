import { promisify } from "node:util";
import sharp from "sharp";
import tmp from "tmp";

export type ImageFormat = keyof sharp.FormatEnum;

const tmpFile = promisify<string>(tmp.file);

export const optimizeScreenshot = async (filepath: string): Promise<string> => {
  try {
    const resultFilePath = await tmpFile();
    await sharp(filepath)
      .resize(2048, 20480, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ force: true })
      .toFile(resultFilePath);
    return resultFilePath;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Error";
    throw new Error(`Error while processing image (${filepath}): ${message}`, {
      cause: error,
    });
  }
};
