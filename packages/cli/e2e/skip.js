import { exec } from "node:child_process";

exec(
  `node bin/argos-cli.js skip --build-name "argos-cli-e2e-skipped-node-${process.env.NODE_VERSION}-${process.env.OS}"`,
  (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log(stdout);
    console.error(stderr);
  },
);
