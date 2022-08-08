import fs from "mz/fs";

async function isDirectory(pathname) {
  try {
    const stats = await fs.stat(pathname);
    return stats.isDirectory();
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export default isDirectory;
