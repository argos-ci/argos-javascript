import { setProjectAnnotations } from "@storybook/react-vite";
import * as projectAnnotations from "./preview";
import * as addonAnnotations from "storybook-addon-pseudo-states/preview";

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
setProjectAnnotations([projectAnnotations, addonAnnotations]);
