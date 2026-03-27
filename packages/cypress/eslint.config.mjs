import pluginCypress from "eslint-plugin-cypress";
import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    plugins: {
      cypress: pluginCypress,
    },
    rules: {
      "cypress/unsafe-to-chain-command": "error",
    },
  },
];
