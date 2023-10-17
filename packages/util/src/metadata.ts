export type ScreenshotMetadata = {
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  media: {
    colorScheme: "light" | "dark";
    mediaType: "screen" | "print";
  };
  browser: {
    name: string;
    version: string;
  };
  controller: {
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
