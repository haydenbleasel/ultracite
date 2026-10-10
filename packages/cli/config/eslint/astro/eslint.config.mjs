/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import typescript from "@typescript-eslint/eslint-plugin";
// biome-ignore lint/performance/noNamespaceImport: Required for ESLint parser compatibility
import * as typescriptParser from "@typescript-eslint/parser"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint parser compatibility
import { configs } from "eslint-plugin-astro";

import componentScripts from "../core/component-scripts.mjs";
import { scriptConfig } from "../core/eslint.config.mjs";
import astroRules from "./rules/astro.mjs";

const [nameReplacementsLevel, nameReplacementsOptions] =
  scriptConfig.rules["unicorn/name-replacements"];

const astro = [
  // The plugin's base config registers astro-eslint-parser (from the
  // plugin's own dependencies) and the processor that extracts client-side
  // <script> tags.
  ...configs["flat/base"],
  // Core's rules for the frontmatter (client-side scripts are virtual .js
  // or .ts files core already matches), before the Astro rules so those
  // win.
  ...componentScripts(["**/*.astro"]),
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        // Parses the TypeScript frontmatter. ESLint's config merge drops the
        // base config's copy of the parser (a getter-backed CommonJS
        // namespace), after which astro-eslint-parser looks for
        // @typescript-eslint/parser from the working directory and falls back
        // to espree, failing every `interface` and type annotation, when it
        // is not found there.
        parser: typescriptParser,
      },
    },
    rules: {
      ...astroRules,
      // Astro types a component's props through an interface named Props.
      "unicorn/name-replacements": [
        nameReplacementsLevel,
        {
          ...nameReplacementsOptions,
          allowList: { ...nameReplacementsOptions.allowList, Props: true },
        },
      ],
    },
  },
  {
    // Client-side <script> tags are linted as virtual files such as
    // `page.astro/1_1.ts`. They exist only in memory, so the TypeScript
    // project service cannot type-check them; switch type-aware linting off
    // for them instead of failing every page that has a script tag.
    ...typescript.configs["flat/disable-type-checked"],
    files: ["**/*.astro/*.js", "**/*.astro/*.ts"],
  },
  {
    // The processor names those virtual files `1_1.ts`, `2_1.js`, …, which no
    // filename convention can match.
    files: ["**/*.astro/*.js", "**/*.astro/*.ts"],
    rules: {
      "github/filenames-match-regex": "off",
      "unicorn/filename-case": "off",
    },
  },
];

export default astro;
