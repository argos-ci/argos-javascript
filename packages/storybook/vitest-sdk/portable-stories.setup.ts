import { setProjectAnnotations } from "@storybook/react-vite";
import * as projectAnnotations from "../.storybook/preview";
import * as addonAnnotations from "storybook-addon-pseudo-states/preview";

// Portable stories need the project annotations applied by hand. Only for the
// project that renders them: `@storybook/addon-vitest` applies them itself,
// and Storybook 11 throws if a setup file of its project calls this.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
setProjectAnnotations([projectAnnotations, addonAnnotations]);
