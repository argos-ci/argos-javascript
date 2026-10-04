import { definePreview } from "@storybook/react-vite";

// CSF Factories: stories compose with this preview directly, without
// `setProjectAnnotations()`. Storybook still stores it on the global the Argos
// recorder hooks into.
export default definePreview({ addons: [] });
