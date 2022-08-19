const { upload } = require("@argos-ci/core");
const { runUpload } = require("./run-upload.cjs");

runUpload(upload, "@argos/core--cjs");
