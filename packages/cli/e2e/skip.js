import { assert, run } from "./utils.js";

const buildName = `argos-cli-e2e-skipped-node-${process.env.NODE_VERSION}-${process.env.OS}`;

const skipResult = run(["skip", "--build-name", buildName]);

console.log(skipResult.stdout);
console.error(skipResult.stderr);

const buildNumberMatch = skipResult.combined.match(/\/builds\/(\d+)/);
assert(buildNumberMatch, "skip returns a build URL");
