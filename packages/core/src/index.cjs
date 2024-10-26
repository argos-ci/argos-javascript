exports.upload = async (...args) => {
  const { upload } = await import("./index.js");
  return upload(...args);
};

exports.finalize = async (...args) => {
  const { finalize } = await import("./index.js");
  return finalize(...args);
};

exports.readConfig = async (...args) => {
  const { readConfig } = await import("./index.js");
  return readConfig(...args);
};
