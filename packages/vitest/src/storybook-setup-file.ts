import { installStoryRecorder } from "./storybook";

// Registered ahead of the user's setup files by the Argos plugin, so the
// recorder is in place before Storybook's project annotations are set. See
// `installStoryRecorder`.
await installStoryRecorder();
