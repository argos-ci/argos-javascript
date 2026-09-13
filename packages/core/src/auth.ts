import {
  isGitHubActionsOidcAvailable,
  exchangeGitHubActionsOidcToken,
} from "./github-actions-oidc";
import {
  isGitHubActionsTokenlessAvailable,
  exchangeGitHubActionsTokenlessToken,
} from "./github-actions-tokenless";
import type { Config } from "./config";
import { debug, maskToken } from "./debug";

/**
 * Resolve the Argos authentication token.
 * Priority: ARGOS_TOKEN > GitHub Actions OIDC > GitHub Actions tokenless exchange.
 */
export async function resolveArgosToken(config: Config): Promise<string> {
  if (config.token) {
    // Masked, and logged here only: this is the one place that knows which
    // token the command ends up using, whether it came from the parameters or
    // from the environment.
    debug(`Authenticated with ARGOS_TOKEN (${maskToken(config.token)}).`);
    return config.token;
  }

  if (isGitHubActionsOidcAvailable()) {
    const token = await exchangeGitHubActionsOidcToken({
      apiBaseUrl: config.apiBaseUrl,
      config,
    });
    debug("Authenticated with GitHub Actions OIDC.");
    debug(`Repository: ${config.originalRepository}`);
    debug(`Run: ${config.runId}`);
    return token;
  }

  if (isGitHubActionsTokenlessAvailable(config)) {
    const token = await exchangeGitHubActionsTokenlessToken({
      apiBaseUrl: config.apiBaseUrl,
      config,
    });
    debug("Authenticated with GitHub Actions tokenless exchange.");
    debug(`Repository: ${config.originalRepository}`);
    debug(`Run: ${config.runId}`);
    return token;
  }

  throw new Error("Missing Argos repository token 'ARGOS_TOKEN'");
}
