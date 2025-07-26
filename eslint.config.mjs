// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import tseslint from "typescript-eslint";
import globals from "globals";

const config = tseslint.config(
  {
    name: "argos/global-ignores",
    ignores: ["**/dist", "examples", "docs"],
  },
  {
    name: "argos/globals",
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: "argos/custom-ts-rules",
    rules: {
      curly: "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    name: "argos/cjs",
    files: ["**/*.c[tj]s"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    name: "argos/jest",
    files: ["**/*.spec.[tj]s"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    name: "argos/vitest",
    files: ["**/*.test.?(m)[tj]s"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
);

export default config;
