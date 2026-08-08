import type { Command } from "commander";
import { registerTestChanges } from "./changes";
import { registerTestComment } from "./comment";
import { registerTestGet } from "./get";
import { registerTestList } from "./list";
import { registerTestSubscribe, registerTestUnsubscribe } from "./subscription";

export function testCommand(program: Command) {
  const test = program
    .command("test")
    .description(
      "Inspect a test's flakiness and the changes that keep coming back",
    );
  registerTestList(test);
  registerTestGet(test);
  registerTestChanges(test);
  registerTestComment(test);
  registerTestSubscribe(test);
  registerTestUnsubscribe(test);
}
