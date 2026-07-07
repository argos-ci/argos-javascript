import { TallContent } from "./TallContent";
import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Regression stories for screenshots being cut off when the content is taller
 * than the viewport in the Vitest integration.
 *
 * The story renders inside an `<iframe data-vitest="true">` and Argos
 * screenshots the iframe's `<body>`. If the iframe is not grown to fit the
 * content, everything overflowing the iframe box is not painted and the
 * screenshot is cut. This must work both with and without `fitToContent`.
 */
const meta = {
  title: "Repro/TallContent",
  component: TallContent,
  parameters: {
    layout: "fullscreen",
    argos: { modes: null },
  },
} satisfies Meta<typeof TallContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutFitToContent: Story = {
  args: { count: 40 },
  parameters: {
    argos: { fitToContent: false, modes: null },
  },
};

export const WithFitToContent: Story = {
  args: { count: 40 },
  parameters: {
    argos: { fitToContent: true, modes: null },
  },
};
