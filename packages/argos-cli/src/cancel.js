import fetch from "node-fetch";
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

  const externalBuildId =
    externalBuildIdOption || config.get("externalBuildId");

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
