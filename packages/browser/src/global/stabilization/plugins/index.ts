import type { Plugin } from "..";
import { plugin as ariaBusy } from "./aria-busy";
import { plugin as cssCustom } from "./css-custom";
import { plugin as cssPreflight } from "./css-preflight";
import { plugin as elementPosition } from "./element-position";
import { plugin as fonts } from "./fonts";
import { plugin as globalClass } from "./global-class";
import { plugin as imageSize } from "./image-size";
import { plugin as imageSrcset } from "./image-srcset";
import { plugin as images } from "./images";
import { plugin as spellcheck } from "./spellcheck";

export const plugins: Plugin[] = [
  ariaBusy,
  cssCustom,
  cssPreflight,
  elementPosition,
  fonts,
  globalClass,
  imageSize,
  imageSrcset,
  images,
  spellcheck,
];
