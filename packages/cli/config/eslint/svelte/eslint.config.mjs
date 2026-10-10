/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

// biome-ignore lint/performance/noNamespaceImport: Required for ESLint parser compatibility
import * as typescriptParser from "@typescript-eslint/parser"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint parser compatibility
import sveltePlugin from "eslint-plugin-svelte";

import componentScripts from "../core/component-scripts.mjs";
import { scriptConfig } from "../core/eslint.config.mjs";
import svelteRules from "./rules/svelte.mjs";

const [nameReplacementsLevel, nameReplacementsOptions] =
  scriptConfig.rules["unicorn/name-replacements"];

const svelte = [
  // The plugin's base config registers svelte-eslint-parser (from the
  // plugin's own dependencies) for .svelte components and .svelte.js/.ts
  // rune modules.
  ...sveltePlugin.configs["flat/base"],
  // Core's rules for the <script> blocks (rune modules are .js or .ts files
  // core already matches), before the Svelte rules so those win.
  ...componentScripts(["**/*.svelte"]),
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
      // Runes break three of core's assumptions. svelte/prefer-const replaces
      // prefer-const, which flags `let { data } = $props()`; a top-level
      // `$state` is meant to be assigned from event handlers; and a
      // component's top-level declarations belong to the component, not the
      // global scope.
      "prefer-const": "off",
      "sonarjs/declarations-in-global-scope": "off",
      // SvelteKit generates the PageProps and LayoutProps types in ./$types.
      "unicorn/name-replacements": [
        nameReplacementsLevel,
        {
          ...nameReplacementsOptions,
          allowList: {
            ...nameReplacementsOptions.allowList,
            LayoutProps: true,
            PageProps: true,
          },
        },
      ],
      "unicorn/no-top-level-assignment-in-function": "off",
    },
  },
];

export default svelte;
