import { readFile } from "node:fs/promises";
import axios from "axios";
import type { ImageFormat } from "./optimize";

interface UploadInput {
  url: string;
  path: string;
  format: ImageFormat;
}

const formatToContentType = (format: ImageFormat) => {
  switch (format) {
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    default:
      throw new Error(`Unsupported format ${format}`);
  }
};

export const upload = async (input: UploadInput) => {
  const file = await readFile(input.path);
  await axios({
    method: "PUT",
    url: input.url,
    data: file,
    headers: {
      "Content-Type": formatToContentType(input.format),
    },
  });
};
