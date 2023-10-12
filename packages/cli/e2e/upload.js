import { exec } from "child_process";

exec(
  `node bin/argos-cli.js upload ../../__fixtures__ --build-name "argos-cli-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}"`,
  (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  },
);
