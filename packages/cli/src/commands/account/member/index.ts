import type { Command } from "commander";
import { registerMemberList } from "./list";
import { registerMemberRemove } from "./remove";
import { registerMemberSetLevel } from "./set-level";

export function registerAccountMember(account: Command) {
  const member = account
    .command("member")
    .description("List a team's members, change their role, or remove them");
  registerMemberList(member);
  registerMemberSetLevel(member);
  registerMemberRemove(member);
}
