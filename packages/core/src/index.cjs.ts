import type { UploadParameters } from "./index";

exports.upload = async (params: UploadParameters) => {
  // @ts-ignore
  const { upload } = await import("./index.mjs");
  return upload(params);
};
