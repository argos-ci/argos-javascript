import type { StorybookConfig } from "@storybook/react-vite";

// Storybook config the `@storybook/addon-vitest` project of the
// `@argos-ci/vitest` e2e runs. Only stories whose play functions do not call
// `@argos-ci/storybook`, whose commands that project does not register.
const config: StorybookConfig = {
  stories: ["../../stories/Header.stories.ts"],
  addons: ["@storybook/addon-vitest"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};
export default config;
