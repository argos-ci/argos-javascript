import { upload } from "@argos-ci/core";
import { runUpload } from "./run-upload.cjs";

runUpload(upload, `argos-core-e2e-mjs-node-v${process.env.NODE_VERSION}`);
