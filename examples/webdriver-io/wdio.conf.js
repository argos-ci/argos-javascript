/**
 * See https://webdriver.io/docs/configurationfile.
 */
export const config = {
  runner: "local",
  specs: ["./test/specs/**/*.js"],
  maxInstances: 10,

  // WebdriverIO downloads the browser driver for you.
  capabilities: [
    {
      browserName: "chrome",
      "goog:chromeOptions": {
        // Run Chrome without a window, as on CI.
        args: ["--headless"],
      },
    },
  ],

  logLevel: "warn",
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },
};
