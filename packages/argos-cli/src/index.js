/* eslint-disable no-console */

import program from "commander";
import chalk from "chalk";
import updateNotifier from "update-notifier";
import errorReporter, { initializeErrorReporter } from "./errorReporter";
import pkg from "../package.json";
import upload, { UploadError } from "./upload";
import cancel, { CancelError } from "./cancel";
import { displayError, displaySuccess } from "./display";

updateNotifier({ pkg }).notify();
initializeErrorReporter();

if (process.env.NODE_ENV !== "production") {
  process.on("exit", (code) => {
    console.info(`exit code: ${code}`);
  });
}

const list = (value) => value.split(",");

program.version(pkg.version);

program
  .command("upload <directory>")
  .description("Upload screenshots")
  .option("-T, --token <token>", "Repository token")
  .option("-C, --commit <commit>", "Git commit")
  .option("-B, --branch <branch>", "Git branch")
  .option("--external-build-id [string]", "ID of the build (batch mode only)")
  .option(
    "--batchCount [int]",
    "Number of batches expected (batch mode)",
    parseInt
  )
  .option("--build-name [string]", "Name of the build")
  .option(
    "--ignore <list>",
    'List of glob files to ignore (ex: "**/*.png,**/diff.jpg")',
    list
  )
  .action(async (directory, command) => {
    console.log(`=== argos-cli: uploading '${directory}' directory...\n`);

    let json;

    try {
      const res = await upload({
        directory,
        ...command,
      });
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch (error) {
        throw new Error(
          `${res.status}: Failed to parse response body as JSON:\n\n${text}`
        );
      }

      if (json.error) {
        throw new UploadError(json.error.message);
      }
    } catch (error) {
      displayError("Sorry an error happened:");

      if (error instanceof UploadError) {
        console.error(chalk.bold.red(error.message));
      } else {
        errorReporter.captureException(error);
        console.error(chalk.bold.red(error.message));
        console.error(chalk.bold.red(error.stack));
      }

      process.exit(1);
    }

    displaySuccess("Upload complete!");
    console.log(chalk.green(`build id: ${json.build.id}`));
    console.log(chalk.green(`build url: ${json.build.buildUrl}`));
  });

program
  .command("cancel")
  .description("Cancel the build (batch mode only)")
  .option("-T, --token <token>", "Repository token")
  .option("--external-build-id [string]", "ID of the build (batch mode only)")
  .action(async (command) => {
    console.log(`=== argos-cli: canceling build`);

    let json;

    try {
      const res = await cancel({ ...command });
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch (error) {
        throw new Error(
          `${res.status}: Failed to parse response body as JSON:\n\n${text}`
        );
      }

      if (json.error) {
        throw new CancelError(json.error.message);
      }
    } catch (error) {
      displayError("Sorry an error happened:");

      if (error instanceof CancelError) {
        console.error(chalk.bold.red(error.message));
      } else {
        errorReporter.captureException(error);
        console.error(chalk.bold.red(error.message));
        console.error(chalk.bold.red(error.stack));
      }

      process.exit(1);
    }

    displaySuccess("Build canceled.");
  });

if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}
