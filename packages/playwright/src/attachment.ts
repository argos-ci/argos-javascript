import type { TestResult } from "@playwright/test/reporter";
import { METADATA_EXTENSION, PNG_EXTENSION } from "./util";

export type ArgosAttachment = {
  name: string;
  contentType: string;
  path: string;
};

export function getAttachmentName(
  name: string,
  type: "screenshot" | "snapshot" | "metadata",
) {
  return `argos/${type}___${name}`;
}

function getOriginalAttachmentName(name: string) {
  return name.replace(/^argos\/[^/]+___/, "");
}

export function getAttachmentFilename(name: string) {
  if (name.startsWith("argos/screenshot")) {
    return `${getOriginalAttachmentName(name)}${PNG_EXTENSION}`;
  }
  if (name.startsWith("argos/snapshot")) {
    return `${getOriginalAttachmentName(name)}.yaml`;
  }
  if (name.startsWith("argos/metadata")) {
    return `${getOriginalAttachmentName(name)}${PNG_EXTENSION}${METADATA_EXTENSION}`;
  }
  throw new Error(`Unknown attachment name: ${name}`);
}

export type Attachment = TestResult["attachments"][number];
export type ArgosScreenshotAttachment = Attachment & {
  path: string;
};
export type ArgosMetadataAttachment = Attachment & {
  path: string;
};
export type AutomaticScreenshotAttachment = Attachment & {
  name: "screenshot";
  path: string;
};
export type TraceAttachment = Attachment & {
  name: "trace";
  path: string;
};

export function checkIsTrace(
  attachment: Attachment,
): attachment is TraceAttachment {
  return (
    attachment.name === "trace" &&
    attachment.contentType === "application/zip" &&
    Boolean(attachment.path)
  );
}

export function checkIsArgosScreenshot(
  attachment: Attachment,
): attachment is ArgosScreenshotAttachment {
  return (
    attachment.name.startsWith("argos/") &&
    attachment.contentType === "image/png" &&
    Boolean(attachment.path)
  );
}

export function checkIsArgosSnapshot(
  attachment: Attachment,
): attachment is ArgosScreenshotAttachment {
  return (
    attachment.name.startsWith("argos/") &&
    attachment.contentType === "application/yaml" &&
    Boolean(attachment.path)
  );
}

export function checkIsArgosScreenshotMetadata(
  attachment: Attachment,
): attachment is ArgosMetadataAttachment {
  return (
    attachment.name.startsWith("argos/") &&
    attachment.contentType === "application/json" &&
    Boolean(attachment.path)
  );
}

export function checkIsAutomaticScreenshot(
  attachment: Attachment,
): attachment is AutomaticScreenshotAttachment {
  return (
    attachment.name === "screenshot" &&
    attachment.contentType === "image/png" &&
    Boolean(attachment.path)
  );
}
