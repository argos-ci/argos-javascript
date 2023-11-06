import { readFile } from "node:fs/promises";
import axios from "axios";

interface UploadInput {
  url: string;
  path: string;
  contentType: string;
}

export const upload = async (input: UploadInput) => {
  const file = await readFile(input.path);
  await axios({
    method: "PUT",
    url: input.url,
    data: file,
    headers: {
      "Content-Type": input.contentType,
    },
  });
};
