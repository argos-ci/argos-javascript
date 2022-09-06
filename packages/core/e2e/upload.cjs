const { upload } = require("@argos-ci/core");
const { runUpload } = require("./run-upload.cjs");

runUpload(upload, `argos-core-e2e-cjs-node-v${process.env.NODE_VERSION}`);
