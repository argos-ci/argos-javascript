import createDebug from "debug";

const KEY = "@argos-ci/core";

export const debug = createDebug(KEY);

export const isDebugEnabled = createDebug.enabled(KEY);

export const debugTime = (arg: string) => {
  if (isDebugEnabled) {
    console.time(arg);
  }
};

export const debugTimeEnd = (arg: string) => {
  if (isDebugEnabled) {
    console.timeEnd(arg);
  }
};
