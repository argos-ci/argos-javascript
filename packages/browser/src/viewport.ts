export type ViewportOrientation = "portrait" | "landscape";

export type ViewportSize = {
  width: number;
  height: number;
};

const viewportPresets = {
  "macbook-16": { width: 1536, height: 960 },
  "macbook-15": { width: 1440, height: 900 },
  "macbook-13": { width: 1280, height: 800 },
  "macbook-11": { width: 1366, height: 768 },
  "ipad-2": { width: 768, height: 1024 },
  "ipad-mini": { width: 768, height: 1024 },
  "iphone-xr": { width: 414, height: 896 },
  "iphone-x": { width: 375, height: 812 },
  "iphone-6+": { width: 414, height: 736 },
  "iphone-se2": { width: 375, height: 667 },
  "iphone-8": { width: 375, height: 667 },
  "iphone-7": { width: 375, height: 667 },
  "iphone-6": { width: 375, height: 667 },
  "iphone-5": { width: 320, height: 568 },
  "iphone-4": { width: 320, height: 480 },
  "iphone-3": { width: 320, height: 480 },
  "samsung-s10": { width: 360, height: 760 },
  "samsung-note9": { width: 414, height: 846 },
} as const satisfies Record<string, ViewportSize>;

export type ViewportPreset = keyof typeof viewportPresets;

export type ViewportPresetOption = {
  preset: ViewportPreset;
  orientation?: ViewportOrientation;
};

export type ViewportOption =
  | ViewportSize
  | ViewportPresetOption
  | ViewportPreset;

function resolveViewportPreset(
  preset: ViewportPreset,
  orientation: ViewportOrientation,
): ViewportSize {
  const { width, height } = viewportPresets[preset];
  return orientation === "portrait"
    ? { width, height }
    : { width: height, height: width };
}

function checkIsViewportPresetOption(
  value: unknown,
): value is ViewportPresetOption {
  return typeof value === "object" && value !== null && "preset" in value;
}

export function resolveViewport(viewportOption: ViewportOption): ViewportSize {
  if (checkIsViewportPresetOption(viewportOption)) {
    return resolveViewportPreset(
      viewportOption.preset,
      viewportOption.orientation ?? "portrait",
    );
  }
  if (typeof viewportOption === "string") {
    return resolveViewportPreset(viewportOption, "portrait");
  }
  return viewportOption;
}
