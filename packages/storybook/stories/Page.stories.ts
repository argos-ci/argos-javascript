import { expect, userEvent, within } from "storybook/test";

import { Page } from "./Page";
import { allModes } from "../.storybook/modes";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Example/Page",
  component: Page,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",

    argos: {
      fitToContent: false,
      modes: {
        light: { disabled: true },
        dark: { disabled: true },
        mobile: allModes.mobile,
        "dark tablet": allModes["dark tablet"],
      },
    },
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {};

export const LoggedIn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const loginButton = canvas.getByRole("button", { name: /Log in/i });
    await expect(loginButton).toBeInTheDocument();
    await userEvent.click(loginButton);
    await expect(loginButton).not.toBeInTheDocument();

    const logoutButton = canvas.getByRole("button", { name: /Log out/i });
    await expect(logoutButton).toBeInTheDocument();
  },
};

export const LoggedOutNoMode: Story = {
  parameters: {
    argos: {
      modes: null,
    },
  },
};
