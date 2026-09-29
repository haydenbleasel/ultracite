/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import typescript from "@typescript-eslint/eslint-plugin";
// biome-ignore lint/performance/noNamespaceImport: Required for ESLint parser compatibility
import * as typescriptParser from "@typescript-eslint/parser"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint parser compatibility
import { configs } from "eslint-plugin-astro";

import astroRules from "./rules/astro.mjs";

const config = [
  // The plugin's base config registers astro-eslint-parser (from the
  // plugin's own dependencies) and the processor that extracts client-side
  // <script> tags.
  ...configs["flat/base"],
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

export default config;
