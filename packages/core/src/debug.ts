import createDebug from "debug";

const KEY = "@argos-ci/core";

export const debug = createDebug(KEY);

export const debugTime = (arg: string) => {
  const enabled = createDebug.enabled(KEY);
  if (enabled) {
    console.time(arg);
  }
};

export const debugTimeEnd = (arg: string) => {
  const enabled = createDebug.enabled(KEY);
  if (enabled) {
    console.timeEnd(arg);
  }
};
