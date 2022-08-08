/* eslint-disable no-console */

import chalk from "chalk";

export function displayInfo(message) {
  if (process.env.ARGOS_CLI_TEST === "true") {
    return;
  }

  console.info(chalk.cyan(`i  ${message}`));
}

export function displayError(message) {
  if (process.env.ARGOS_CLI_TEST === "true") {
    return;
  }

  console.error(chalk.bold.red(`\n✘  ${message}`));
}

export function displaySuccess(message) {
  console.log(chalk.green(`\n✔  ${message}`));
}
