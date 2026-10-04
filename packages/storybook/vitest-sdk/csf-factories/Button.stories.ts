import { fn } from "storybook/test";
import { Button } from "../../stories/Button";
import preview from "./preview";

const meta = preview.meta({
  title: "Factories/Button",
  component: Button,
  args: { label: "Button", onClick: fn() },
});

// Named explicitly: composed outside the Storybook indexer, a CSF Factories
// story cannot be named after its export.
export const Primary = meta.story({ name: "Primary", args: { primary: true } });
