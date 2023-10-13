import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  use: {
    screenshot: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
