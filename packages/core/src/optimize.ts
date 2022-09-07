import { promisify } from "node:util";
import sharp from "sharp";
import tmp from "tmp";

export type ImageFormat = keyof sharp.FormatEnum;

const tmpFile = promisify<string>(tmp.file);

export const getImageFormat = async (
  filepath: string
): Promise<ImageFormat> => {
  const metadata = await sharp(filepath).metadata();
  if (!metadata.format) {
    throw new Error(`Could not get image format for ${filepath}`);
  }
  return metadata.format;
};

export const optimizeScreenshot = async (
  filepath: string,
  format: ImageFormat
): Promise<string> => {
  const resultFilePath = await tmpFile();
  const optimization = sharp(filepath).resize(2048, 20480, {
    fit: "inside",
    withoutEnlargement: true,
  });
  switch (format) {
    case "jpeg":
    case "jpg": {
      optimization.jpeg();
      break;
    }
    case "png": {
      optimization.png();
      break;
    }
  }
  await optimization.toFile(resultFilePath);
  return resultFilePath;
};
