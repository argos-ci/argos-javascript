// @ts-ignore
const argosScreenshot = async (...args: any) => {
  // @ts-ignore
  const { argosScreenshot } = await import("./index.mjs");
  return argosScreenshot(...args);
};

// @ts-ignore
exports.argosScreenshot = argosScreenshot;
