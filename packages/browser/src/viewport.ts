export type ViewportOrientation = "portrait" | "landscape";

export type ViewportSize = {
  width: number;
  height: number;
};

const viewportPresets = {
  "pro-display": { width: 3008, height: 1962 },
  "studio-display": { width: 2560, height: 1440 },
  "imac-24": { width: 2240, height: 1260 },
  "macbook-16": { width: 1536, height: 960 },
  "macbook-15": { width: 1440, height: 900 },
  "macbook-13": { width: 1280, height: 800 },
  "macbook-11": { width: 1366, height: 768 },
  "ipad-12-pro": { width: 1024, height: 1366 },
  "ipad-11-pro": { width: 834, height: 1194 },
  "ipad-10": { width: 810, height: 1080 },
  "ipad-10-pro": { width: 834, height: 1112 },
  "ipad-9-pro": { width: 768, height: 1024 },
  "ipad-2": { width: 768, height: 1024 },
  "ipad-mini": { width: 768, height: 1024 },
  "iphone-air": { width: 420, height: 912 },
  "iphone-17": { width: 402, height: 874 },
  "iphone-17-pro": { width: 402, height: 873 },
  "iphone-17-pro-max": { width: 440, height: 956 },
  "iphone-16": { width: 393, height: 852 },
  "iphone-16e": { width: 390, height: 844 },
  "iphone-16-plus": { width: 430, height: 932 },
  "iphone-16-pro": { width: 402, height: 874 },
  "iphone-16-pro-max": { width: 440, height: 956 },
  "iphone-15": { width: 393, height: 852 },
  "iphone-15-plus": { width: 430, height: 932 },
  "iphone-15-pro": { width: 393, height: 852 },
  "iphone-15-pro-max": { width: 430, height: 932 },
  "iphone-14": { width: 390, height: 844 },
  "iphone-14-plus": { width: 428, height: 926 },
  "iphone-14-pro": { width: 393, height: 852 },
  "iphone-14-pro-max": { width: 490, height: 932 },
  "iphone-13": { width: 390, height: 844 },
  "iphone-13-mini": { width: 360, height: 780 },
  "iphone-13-pro": { width: 390, height: 844 },
  "iphone-13-pro-max": { width: 428, height: 926 },
  "iphone-12": { width: 390, height: 844 },
  "iphone-12-mini": { width: 360, height: 780 },
  "iphone-12-pro": { width: 390, height: 844 },
  "iphone-12-pro-max": { width: 428, height: 926 },
  "iphone-11": { width: 414, height: 896 },
  "iphone-11-pro": { width: 375, height: 812 },
  "iphone-11-pro-max": { width: 414, height: 896 },
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
