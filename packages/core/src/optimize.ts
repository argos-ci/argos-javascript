import { promisify } from "node:util";
import sharp from "sharp";
import tmp from "tmp";

const tmpFile = promisify<string>(tmp.file);

export const optimizeScreenshot = async (filepath: string) => {
  const [resultFilePath, metadata] = await Promise.all([
    tmpFile(),
    sharp(filepath).metadata(),
  ]);
  const optimization = sharp(filepath).resize(2048, 20480, {
    fit: "inside",
    withoutEnlargement: true,
  });
  switch (metadata.format) {
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
