import type { Command } from "commander";

import { clearStoredCredentials, getStoredCredentials } from "../auth";
import { revokeToken } from "../lib/oauth";

export function logoutCommand(program: Command) {
  program
    .command("logout")
    .description("Log out from Argos")
    .action(async () => {
      const { legacyToken, oauth } = await getStoredCredentials();
      if (!legacyToken && !oauth) {
        console.log("No token found. You are already logged out.");
        return;
      }
      if (oauth) {
        // Best-effort server-side revocation (invalidates the access tokens too).
        await revokeToken(oauth.refreshToken);
      }
      await clearStoredCredentials();
      console.log("Logged out from Argos.");
    });
}
