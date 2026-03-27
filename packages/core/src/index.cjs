exports.upload = async (...args) => {
  const { upload } = await import("./index.mjs");
  return upload(...args);
};

exports.finalize = async (...args) => {
  const { finalize } = await import("./index.mjs");
  return finalize(...args);
};

exports.readConfig = async (...args) => {
  const { readConfig } = await import("./index.mjs");
  return readConfig(...args);
};
