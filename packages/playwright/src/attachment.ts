export function getAttachmentName(name: string, type: string) {
  return `argos/${type}___${name}`;
}

function getOriginalAttachmentName(name: string) {
  return name.replace(/^argos\/[^/]+___/, "");
}

export function getAttachementFilename(name: string) {
  if (name.startsWith("argos/screenshot")) {
    return `${getOriginalAttachmentName(name)}.png`;
  }
  if (name.startsWith("argos/metadata")) {
    return `${getOriginalAttachmentName(name)}.png.argos.json`;
  }
  throw new Error(`Unknown attachment name: ${name}`);
}
