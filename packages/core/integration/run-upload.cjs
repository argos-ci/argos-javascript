const { join } = require("node:path");

/**
 * Run upload command.
 * @param {typeof import('../src/index').upload} implementation
 * @param {string} name
 */
const runUpload = async (implementation, name) => {
  try {
    const result = await implementation({
      cwd: join(__dirname, "../__fixtures__/screenshots"),
      token: process.env.ARGOS_TOKEN,
      name,
    });
    console.log(result);
  } catch (err) {
    if (err.response) {
      console.error("Status: %s", err.response.status);
      if (err.response?.data?.message) {
        console.error(err.response?.data?.message);
      }
    }
    process.exit(1);
  }
};
exports.runUpload = runUpload;
