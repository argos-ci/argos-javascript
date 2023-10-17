export type ScreenshotMetadata = {
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  colorScheme: "light" | "dark";
  mediaType: "screen" | "print";
  browser: {
    name: string;
    version: string;
  };
  automationLibrary: {
    name: string;
    version: string;
  };
  sdk: {
    name: string;
    version: string;
  };
};

/**
 * Get metadata path from screenshot path.
 */
export function getMetadataPath(screenshotPath: string) {
  return screenshotPath + ".argos.json";
}
