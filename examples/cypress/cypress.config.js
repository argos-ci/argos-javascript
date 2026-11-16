const { defineConfig } = require("cypress");
const { registerArgosTask } = require("@argos-ci/cypress/task");

module.exports = defineConfig({
  // setupNodeEvents can also be defined in "component"
  e2e: {
    async setupNodeEvents(on, config) {
      registerArgosTask(on, config, {
        // Upload to Argos on CI only.
        uploadToArgos: !!process.env.CI,
      });

      // include any other plugin code...
    },
  },
});
