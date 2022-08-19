import { promisify } from "node:util";
import sharp from "sharp";
import tmp from "tmp";

const tmpFile = promisify<string>(tmp.file);

export const optimizeScreenshot = async (filepath: string) => {
  const resultFilePath = await tmpFile();
  await sharp(filepath)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg()
    .toFile(resultFilePath);
  return resultFilePath;
};
