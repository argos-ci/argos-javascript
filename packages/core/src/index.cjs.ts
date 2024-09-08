exports.upload = async (...args: any[]) => {
  // @ts-ignore
  const { upload } = await import("./index.mjs");
  return upload(...args);
};

exports.finalize = async (...args: any[]) => {
  // @ts-ignore
  const { finalize } = await import("./index.mjs");
  return finalize(...args);
};

exports.readConfig = async (...args: any[]) => {
  // @ts-ignore
  const { readConfig } = await import("./index.mjs");
  return readConfig(...args);
};
