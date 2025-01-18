export type ScreenshotMetadata = {
  url?: string;
  previewUrl?: string;
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
    repeat?: number;
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
  // Metdata used to pass informations later removed from metadata.
  transient?: {
    threshold?: number;
    baseName?: string;
  };
};

/**
 * Get metadata path from screenshot path.
 */
export function getMetadataPath(screenshotPath: string) {
  return screenshotPath + ".argos.json";
}
