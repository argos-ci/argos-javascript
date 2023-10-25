export type ScreenshotMetadata = {
  url?: string;
  viewport?: {
    width: number;
    height: number;
  };
  colorScheme?: "light" | "dark";
  mediaType?: "screen" | "print";
  test: {
    id?: string;
    title: string;
    titlePath: string[];
    retries?: number;
    retry?: number;
    location?: {
      file: string;
      line: number;
      column: number;
    };
  } | null;
  browser?: {
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
