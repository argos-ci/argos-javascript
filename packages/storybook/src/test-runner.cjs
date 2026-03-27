const argosScreenshot = async (...args) => {
  const { argosScreenshot } = await import("./test-runner.mjs");
  return argosScreenshot(...args);
};
exports.argosScreenshot = argosScreenshot;
