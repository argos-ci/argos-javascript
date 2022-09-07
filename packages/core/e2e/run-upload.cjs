const { join } = require("node:path");

/**
 * Run upload command.
 * @param {typeof import('../src/index').upload} implementation
 * @param {string} buildName
 */
const runUpload = async (implementation, buildName) => {
  try {
    const result = await implementation({
      root: join(__dirname, "../../../__fixtures__/screenshots"),
      token: process.env.ARGOS_TOKEN,
      buildName,
    });
    console.log(result);
  } catch (err) {
    if (err.response) {
      console.error("Status: %s", err.response.status);
      if (err.response?.data?.message) {
        console.error(err.response?.data?.message);
      }
    } else {
      console.error(err);
    }
    process.exit(1);
  }
};
exports.runUpload = runUpload;
