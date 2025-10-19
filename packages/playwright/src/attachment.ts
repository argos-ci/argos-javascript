import type { TestResult } from "@playwright/test/reporter";
import { METADATA_EXTENSION, PNG_EXTENSION, ARIA_EXTENSION } from "./util";

export type ArgosAttachment = {
  name: string;
  contentType: string;
  path: string;
};

type ArgosAttachmentType =
  | "screenshot"
  | "aria"
  | "screenshot/metadata"
  | "aria/metadata";

export function getAttachmentName(name: string, type: ArgosAttachmentType) {
  return `argos/${type}___${name}`;
}

function parseAttachmentName(name: string): {
  type: ArgosAttachmentType;
  originalName: string;
} | null {
  const match = name.match(/^argos\/(screenshot|aria)(\/metadata)?___(.*)$/);
  if (!match) {
    return null;
  }
  const [, mainType, metadataPart, originalName] = match;
  if (!originalName) {
    throw new Error(`Invalid attachment name: ${name}`);
  }
  const type: ArgosAttachmentType = metadataPart
    ? (`${mainType}/metadata` as ArgosAttachmentType)
    : (mainType as ArgosAttachmentType);
  return { type, originalName };
}

export function getAttachmentFilename(attachment: Attachment): string {
  const parsed = parseAttachmentName(attachment.name);
  if (!parsed) {
    throw new Error(`Invalid attachment name: ${attachment.name}`);
  }
  const { type, originalName } = parsed;
  const extension = {
    screenshot: PNG_EXTENSION,
    aria: ARIA_EXTENSION,
    "screenshot/metadata": `${PNG_EXTENSION}${METADATA_EXTENSION}`,
    "aria/metadata": `${ARIA_EXTENSION}${METADATA_EXTENSION}`,
  }[type];
  return `${originalName}${extension}`;
}

export type Attachment = TestResult["attachments"][number];
export type ArgosSnapshotAttachment = Attachment & {
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

export function checkIsArgosSnapshot(
  attachment: Attachment,
): attachment is ArgosSnapshotAttachment {
  const parsed = parseAttachmentName(attachment.name);
  if (!parsed) {
    return false;
  }
  return parsed.type === "aria" || parsed.type === "screenshot";
}

export function checkIsArgosMetadata(
  attachment: Attachment,
): attachment is ArgosMetadataAttachment {
  const parsed = parseAttachmentName(attachment.name);
  if (!parsed) {
    return false;
  }
  return (
    parsed.type === "aria/metadata" || parsed.type === "screenshot/metadata"
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
