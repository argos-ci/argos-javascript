import sharp from "sharp";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";

type Size = { width: number; height: number };
type Coords = { x: number; y: number; width: number; height: number };

// Function to create a mask with Sharp
async function createMask(
  dimensions: Size,
  areas: Coords[],
  maskColor: string,
) {
  // Start with a black image
  let mask = sharp({
    create: {
      width: dimensions.width,
      height: dimensions.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const areasImages = areas.map((coords) => ({
    input: Buffer.from(
      '<svg><rect x="0" y="0" width="' +
        coords.width +
        '" height="' +
        coords.height +
        `" fill="${maskColor}"/></svg>`,
    ),
    top: coords.y,
    left: coords.x,
  }));

  mask = mask.composite(areasImages);

  return mask.png().toBuffer();
}

async function applyMask(image: Buffer, mask: Buffer) {
  try {
    return await sharp(image)
      .composite([
        {
          input: mask,
          blend: "over",
        },
      ])
      .png()
      .toBuffer();
  } catch (err) {
    throw new Error("Error applying mask", { cause: err });
  }
}

async function getImageDimensions(buffer: Buffer): Promise<Size> {
  try {
    const imageInfo = await sharp(buffer).metadata();
    const { width, height } = imageInfo;
    if (!width || !height) {
      throw new Error("Dimensions not found.");
    }
    return { width, height };
  } catch (err) {
    throw new Error("Error getting image dimensions", { cause: err });
  }
}

async function getFilePath(name: string) {
  if (name.endsWith(".png")) return name;

  const screenshotFolder = resolve(process.cwd(), "screenshots/argos");
  await mkdir(screenshotFolder, { recursive: true });
  return resolve(screenshotFolder, name + ".png");
}

export type ArgosScreenshotOptions = {
  /**
   * Specify ares that should be masked when the screenshot is taken.
   * Masked elements will be overlaid with a pink box #FF00FF (customized by maskColor)
   * that completely covers its bounding box.
   */
  mask?: { x: number; y: number; width: number; height: number }[];
  /**
   * Specify the color of the overlay box for masked elements, in CSS color format.
   * Default color is pink #FF00FF.
   * @default "#FF00FF"
   */
  maskColor?: string;
};

/**
 * Take a screenshot of the current page, optionally masking certain areas.
 * @param browser A WebdriverIO `browser` object.
 * @param filepath The path to save the screenshot to.
 * @param options Options for the screenshot.
 */
export async function argosScreenshot(
  browser: WebdriverIO.Browser,
  name: string,
  { mask, maskColor = "#FF00FF" }: ArgosScreenshotOptions = {},
) {
  if (!browser) {
    throw new Error("A WebdriverIO `browser` object is required.");
  }
  if (!name) {
    throw new Error("The `name` argument is required.");
  }

  const filepath = await getFilePath(name);
  const imageBuffer = await browser.saveScreenshot(filepath);

  if (!mask) {
    return imageBuffer;
  }

  const dimensions = await getImageDimensions(imageBuffer);
  const maskBuffer = await createMask(dimensions, mask, maskColor);
  const maskedBuffer = await applyMask(imageBuffer, maskBuffer);
  await sharp(maskedBuffer).toFile(filepath);
  return maskedBuffer;
}
