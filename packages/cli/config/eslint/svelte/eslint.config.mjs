/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

// biome-ignore lint/performance/noNamespaceImport: Required for ESLint parser compatibility
import * as typescriptParser from "@typescript-eslint/parser"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint parser compatibility
import svelte from "eslint-plugin-svelte";

import svelteRules from "./rules/svelte.mjs";

const config = [
  // The plugin's base config registers svelte-eslint-parser (from the
  // plugin's own dependencies) for .svelte components and .svelte.js/.ts
  // rune modules.
  ...svelte.configs["flat/base"],
  {
    files: ["**/*.svelte", "**/*.svelte.{js,ts}"],
    languageOptions: {
      parserOptions: {
        extraFileExtensions: [".svelte"],
        // Parses <script> and <script lang="ts"> blocks and rune modules.
        parser: typescriptParser,
      },
    },
    rules: {
      ...svelteRules,
    },
  },
];

export default config;
