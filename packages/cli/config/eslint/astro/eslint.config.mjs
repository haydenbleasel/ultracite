/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import typescript from "@typescript-eslint/eslint-plugin";
import { configs } from "eslint-plugin-astro";

import astroRules from "./rules/astro.mjs";

const config = [
  // The plugin's base config registers astro-eslint-parser (from the
  // plugin's own dependencies, with @typescript-eslint/parser for the
  // frontmatter) and the processor that extracts client-side <script> tags.
  ...configs["flat/base"],
  {
    files: ["**/*.astro"],
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
];

export default config;
