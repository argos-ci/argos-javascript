const argosScreenshot = async (...args) => {
  const { argosScreenshot } = await import("./index.mjs");
  return argosScreenshot(...args);
};

exports.argosScreenshot = argosScreenshot;
