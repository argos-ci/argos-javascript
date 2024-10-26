const argosScreenshot = async (...args) => {
  const { argosScreenshot } = await import("./index.js");
  return argosScreenshot(...args);
};
exports.argosScreenshot = argosScreenshot;

const getCSPScriptHash = async (...args) => {
  const { getCSPScriptHash } = await import("./index.js");
  return getCSPScriptHash(...args);
};
exports.getCSPScriptHash = getCSPScriptHash;

const DO_NOT_USE_setMetadataConfig = async (...args) => {
  const { DO_NOT_USE_setMetadataConfig } = await import("./index.js");
  return DO_NOT_USE_setMetadataConfig(...args);
};
exports.DO_NOT_USE_setMetadataConfig = DO_NOT_USE_setMetadataConfig;
