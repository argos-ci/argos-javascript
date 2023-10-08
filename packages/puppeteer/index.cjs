const argosScreenshot = async (...args) => {
  const { argosScreenshot } = await import("./index.js");
  return argosScreenshot(...args);
};

exports.argosScreenshot = argosScreenshot;
