// .storybook/modes.js

export const allModes = {
  mobile: {
    viewport: "iphone12promax",
  },
  tablet: {
    viewport: "ipad",
  },
  dark: {
    theme: "dark",
  },
  light: {
    theme: "light",
  },
  "dark tablet": {
    theme: "dark",
    viewport: "ipad",
  },
  "light mobile": {
    theme: "light",
    viewport: "iphone12promax",
  },
};
