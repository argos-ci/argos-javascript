import type { Command } from "commander";
import { registerInviteCancel } from "./cancel";
import { registerInviteCreate } from "./create";
import { registerInviteList } from "./list";
import { registerInviteResetLink } from "./reset-link";

export function registerAccountInvite(account: Command) {
  const invite = account
    .command("invite")
    .description("Invite people to a team and manage pending invitations");
  registerInviteList(invite);
  registerInviteCreate(invite);
  registerInviteCancel(invite);
  registerInviteResetLink(invite);
}
