import path from "path";
import convict from "convict";

const config = convict({
  endpoint: {
    doc: "Argos API endpoint",
    format: "String",
    default: "https://api.argos-ci.com",
    env: "ARGOS_API_ENDPOINT",
  },
  commit: {
    doc: "Git commit",
    format: String,
    default: "",
    env: "ARGOS_COMMIT",
  },
  branch: {
    doc: "Git branch",
    format: String,
    default: "",
    env: "ARGOS_BRANCH",
  },
  token: {
    doc: "Repository token",
    format: String,
    default: "",
    env: "ARGOS_TOKEN",
  },
  externalBuildId: {
    doc: "External build id (batch mode)",
    format: String,
    default: "",
    env: "ARGOS_EXTERNAL_BUILD_ID",
  },
  batchCount: {
    doc: "Batch count expected (batch mode)",
    format: String,
    default: "",
    env: "ARGOS_BATCH_COUNT",
  },
  buildName: {
    doc: "Build name",
    format: String,
    default: "",
    env: "ARGOS_BUILD_NAME",
  },
});

const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV !== "production") {
  config.loadFile(path.join(__dirname, `../config/${NODE_ENV}.json`));
}

config.validate();

export default config;
