import type { Preview } from "@storybook/react";

import { INITIAL_VIEWPORTS } from "@storybook/addon-viewport";
import { withThemeByClassName } from "@storybook/addon-themes";
import { allModes } from "./modes";

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
  ],
  parameters: {
    argos: {
      modes: {
        light: allModes["light"],
        dark: allModes["dark"],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: INITIAL_VIEWPORTS,
    },
  },
};

export default preview;
