import { WideContent } from "./WideContent";
import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Regression story for screenshots being cut off *horizontally* when the
 * content is wider than the viewport.
 *
 * With `fitToContent`, the content is fit in both dimensions, so the iframe
 * must grow horizontally to paint content wider than the viewport. Otherwise
 * the screenshot is left with a large blank area on the right.
 */
const meta = {
  title: "Repro/WideContent",
  component: WideContent,
  parameters: {
    layout: "fullscreen",
    argos: { modes: null },
  },
} satisfies Meta<typeof WideContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WideWithFitToContent: Story = {
  args: { width: 2400 },
  parameters: {
    argos: { fitToContent: true, modes: null },
  },
};
