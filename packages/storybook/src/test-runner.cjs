const argosScreenshot = async (...args) => {
  const { argosScreenshot } = await import("./test-runner.js");
  return argosScreenshot(...args);
};
exports.argosScreenshot = argosScreenshot;
