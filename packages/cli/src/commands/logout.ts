import type { Command } from "commander";
import { getStoredToken, removeToken } from "../auth";

export function logoutCommand(program: Command) {
  program
    .command("logout")
    .description("Log out from Argos")
    .action(async () => {
      const existing = await getStoredToken();
      if (!existing) {
        console.log("No token found. You are already logged out.");
        return;
      }
      await removeToken();
      console.log("Logged out from Argos.");
    });
}
