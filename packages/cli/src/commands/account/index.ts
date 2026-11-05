import type { Command } from "commander";
import { registerAccountDomain } from "./domain";
import { registerAccountGet } from "./get";
import { registerAccountInvite } from "./invite";
import { registerAccountMember } from "./member";
import { registerAccountProjectToken } from "./project-token";
import { registerAccountUpdate } from "./update";

export function accountCommand(program: Command) {
  const account = program
    .command("account")
    .description(
      "Inspect an account's plan and usage, manage its project tokens, and a team's members, invites, and email domains",
    );
  registerAccountGet(account);
  registerAccountUpdate(account);
  registerAccountMember(account);
  registerAccountInvite(account);
  registerAccountDomain(account);
  registerAccountProjectToken(account);
}
