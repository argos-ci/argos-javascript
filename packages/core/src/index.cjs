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

exports.deploy = async (...args) => {
  const { deploy } = await import("./index.mjs");
  return deploy(...args);
};

exports.skip = async (...args) => {
  const { skip } = await import("./index.mjs");
  return skip(...args);
};
