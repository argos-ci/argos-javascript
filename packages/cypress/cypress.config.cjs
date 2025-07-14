const { defineConfig } = require("cypress");
const { registerArgosTask } = require("@argos-ci/cypress/task");

module.exports = defineConfig({
  video: false,
  screenshotOnRunFailure: false,
  e2e: {
    async setupNodeEvents(on, config) {
      registerArgosTask(on, config, {
        uploadToArgos: process.env.UPLOAD_TO_ARGOS === "true",
        buildName: `argos-cypress-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}`,
      });
    },
  },
});
