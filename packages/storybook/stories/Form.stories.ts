import { userEvent, within } from "storybook/test";
import type { StoryObj, Meta } from "@storybook/react-vite";

import { Form } from "./Form";
import { allModes } from "../.storybook/modes";
import { argosScreenshot } from "../src/vitest";

const meta: Meta<typeof Form> = {
  title: "Example/Form",
  component: Form,
  parameters: {
    argos: {
      modes: {
        dark: { disabled: true },
        tablet: allModes.tablet,
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Form>;

export const FillForm: Story = {
  play: async (ctx) => {
    const { canvasElement } = ctx;
    await argosScreenshot(ctx, "before-fill");

    const canvas = within(canvasElement);

    const emailInput = canvas.getByLabelText("Email", {
      selector: "input",
    });

    await userEvent.type(emailInput, "example-email@email.com", {
      delay: 100,
    });

    const passwordInput = canvas.getByLabelText("Password", {
      selector: "input",
    });

    await userEvent.type(passwordInput, "ExamplePassword", {
      delay: 100,
    });
    // See https://storybook.js.org/docs/essentials/actions#automatically-matching-args to learn how to setup logging in the Actions panel
    const submitButton = canvas.getByRole("button");

    await userEvent.click(submitButton);
  },
};
