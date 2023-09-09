import { upload } from "@argos-ci/core";
import { runUpload } from "./run-upload.cjs";

runUpload(
  upload,
  `argos-core-e2e-mjs-node-${process.env.NODE_VERSION}-${process.env.OS}`,
);
