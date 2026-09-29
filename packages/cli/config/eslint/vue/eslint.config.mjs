/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

// biome-ignore lint/performance/noNamespaceImport: Required for ESLint parser compatibility
import * as typescriptParser from "@typescript-eslint/parser"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint parser compatibility
import eslintPrettier from "eslint-config-prettier";
import vue from "eslint-plugin-vue";

import vueRules from "./rules/vue.mjs";

// Only the vue/ entries — the all-on vue rules would otherwise re-enable
// the template formatting rules that eslint-config-prettier turns off.
// Prettier owns formatting for .vue files.
const vuePrettierOverrides = Object.fromEntries(
  Object.entries(eslintPrettier.rules).filter(([key]) => key.startsWith("vue/"))
);

const config = [
  // The plugin's base config registers vue-eslint-parser (from the plugin's
  // own dependencies) and the SFC processor for .vue files.
  ...vue.configs["flat/base"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        extraFileExtensions: [".vue"],
        // Parses <script> and <script lang="ts"> blocks.
        parser: typescriptParser,
      },
    },
    rules: {
      ...vueRules,
      ...vuePrettierOverrides,
    },
  },
  {
    // Nuxt and file-based Vue Router setups derive routes and layouts from
    // these filenames (`pages/index.vue`, `layouts/default.vue`, `error.vue`,
    // `app.vue`), so they cannot be renamed to multi-word names.
    files: [
      "**/app.vue",
      "**/error.vue",
      "**/layouts/**/*.vue",
      "**/pages/**/*.vue",
    ],
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
];

export default config;
