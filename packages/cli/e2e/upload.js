import { assert, run } from "./utils.js";

const buildName = `argos-cli-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}`;

const uploadResult = run([
  "upload",
  "../../__fixtures__",
  "--build-name",
  buildName,
]);

console.log(uploadResult.stdout);
console.error(uploadResult.stderr);

const buildUrlMatch = uploadResult.combined.match(
  /https?:\/\/\S+\/builds\/\d+/,
);
assert(buildUrlMatch, "upload returns a full build URL");
