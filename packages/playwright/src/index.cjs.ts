/* eslint-disable @typescript-eslint/no-explicit-any */
const argosScreenshot = async (...args: any) => {
  // @ts-ignore
  const { argosScreenshot } = await import("./index.mjs");
  return argosScreenshot(...args);
};

exports.argosScreenshot = argosScreenshot;
