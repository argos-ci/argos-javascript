async function argosAriaSnapshot(...args) {
  const { argosAriaSnapshot } = await import("./index.js");
  return argosAriaSnapshot(...args);
}

async function argosScreenshot(...args) {
  const { argosScreenshot } = await import("./index.js");
  return argosScreenshot(...args);
}

function getCSPScriptHash(...args) {
  // Loading ESM using require works in Node.js v22.13.0+
  const { getCSPScriptHash } = require("./index.js");
  return getCSPScriptHash(...args);
}

function DO_NOT_USE_setMetadataConfig(...args) {
  // Loading ESM using require works in Node.js v22.13.0+
  const { DO_NOT_USE_setMetadataConfig } = require("./index.js");
  return DO_NOT_USE_setMetadataConfig(...args);
}

exports.argosAriaSnapshot = argosAriaSnapshot;
exports.argosScreenshot = argosScreenshot;
exports.getCSPScriptHash = getCSPScriptHash;
exports.DO_NOT_USE_setMetadataConfig = DO_NOT_USE_setMetadataConfig;
