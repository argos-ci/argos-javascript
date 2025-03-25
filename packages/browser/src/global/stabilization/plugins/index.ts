import type { Plugin } from "..";
import { plugin as addArgosClass } from "./addArgosClass";
import { plugin as addArgosCSS } from "./addArgosCSS";
import { plugin as argosHelpers } from "./argosHelpers";
import { plugin as disableSpellCheck } from "./disableSpellCheck";
import { plugin as fontAntialiasing } from "./fontAntialiasing";
import { plugin as hideCarets } from "./hideCarets";
import { plugin as hideScrollbars } from "./hideScrollbars";
import { plugin as loadImageSrcset } from "./loadImageSrcset";
import { plugin as roundImageSize } from "./roundImageSize";
import { plugin as stabilizeSticky } from "./stabilizeSticky";
import { plugin as waitForAriaBusy } from "./waitForAriaBusy";
import { plugin as waitForFonts } from "./waitForFonts";
import { plugin as waitForImages } from "./waitForImages";

export const corePlugins = [addArgosClass, addArgosCSS, argosHelpers];

export const plugins = [
  disableSpellCheck,
  fontAntialiasing,
  hideCarets,
  hideScrollbars,
  loadImageSrcset,
  roundImageSize,
  stabilizeSticky,
  waitForAriaBusy,
  waitForFonts,
  waitForImages,
] satisfies Plugin[];

export type PluginName = (typeof plugins)[number]["name"];
