import fs from "mz/fs";

async function isReadable(pathname) {
  try {
    await fs.access(pathname, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export default isReadable;
