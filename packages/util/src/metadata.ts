export type ScreenshotMetadata = {
  /** @description The URL of the page that was screenshotted */
  url?: string | null;
  /** @description An URL to an accessible preview of the screenshot */
  previewUrl?: string | null;
  viewport?: {
    /** @description The width of the viewport */
    width: number;
    /** @description The height of the viewport */
    height: number;
  } | null;
  /** @description The color scheme when the screenshot was taken */
  colorScheme?: ("light" | "dark") | null;
  /** @description The media type when the screenshot was taken */
  mediaType?: ("screen" | "print") | null;
  test?:
    | ({
        /** @description The unique identifier of the test */
        id?: string | null;
        /** @description The title of the test */
        title: string;
        /** @description The path of titles leading to the test */
        titlePath: string[];
        /** @description The number of retries for the test */
        retries?: number | null;
        /** @description The current retry count */
        retry?: number | null;
        /** @description The repeat count for the test */
        repeat?: number | null;
        /** @description The location of the test in the source code */
        location?: {
          /** @description The located file */
          file: string;
          /** @description The line number in the file */
          line: number;
          /** @description The column number in the file */
          column: number;
        };
        /** @description Annotations associated to the test */
        annotations?: {
          /** @description The type of annotation */
          type: string;
          /** @description The description of the annotation */
          description?: string;
          /** @description The location of the annotation in the source code */
          location?: {
            /** @description The located file */
            file: string;
            /** @description The line number in the file */
            line: number;
            /** @description The column number in the file */
            column: number;
          };
        }[];
      } | null)
    | null;
  browser?: {
    /** @description The name of the browser */
    name: string;
    /** @description The version of the browser */
    version: string;
  } | null;
  /** @description The automation library that generated the screenshot */
  automationLibrary: {
    /** @description The name of the automation library */
    name: string;
    /** @description The version of the automation library */
    version: string;
  };
  /** @description The Argos SDK that generated the screenshot */
  sdk: {
    /** @description The name of the Argos SDK */
    name: string;
    /** @description The version of the Argos SDK */
    version: string;
  };
  // Metadata used to pass informations later removed from metadata.
  transient?: {
    /** Threshold configured for this screenshot. */
    threshold?: number;
    /** Override the name to find the comparison baseline. */
    baseName?: string;
    /** Name of the parent screenshot. */
    parentName?: string;
  };
};

/**
 * Get metadata path from snapshot path.
 */
export function getMetadataPath(snapshotPath: string) {
  return snapshotPath + ".argos.json";
}
