import { userEvent, within } from "storybook/test";

import { Form } from "./Form";
import { allModes } from "../.storybook/modes";

export default {
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

export const FillForm = {
  play: async ({ canvasElement }) => {
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
