import fetch from "node-fetch";
import getEnvironment from "./getEnvironment";
import config from "./config";
import pkg from "../package.json";

export class CancelError extends Error {}

async function cancel(options) {
  const { token: tokenOption, externalBuildId: externalBuildIdOption } =
    options;

  const token = tokenOption || config.get("token");

  if (!token) {
    throw new CancelError(
      "Token missing: use ARGOS_TOKEN or the --token option."
    );
  }

  let environment = {};

  if (process.env.ARGOS_CLI_TEST !== "true") {
    environment = getEnvironment(process.env);
  }

  const externalBuildId =
    externalBuildIdOption ||
    config.get("externalBuildId") ||
    environment.externalBuildId;

  return fetch(`${config.get("endpoint")}/cancel-build`, {
    headers: {
      "X-Argos-CLI-Version": pkg.version,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({ token, externalBuildId }),
  });
}

export default cancel;
