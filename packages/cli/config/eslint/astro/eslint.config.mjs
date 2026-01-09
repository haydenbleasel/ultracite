/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import astro from "eslint-plugin-astro";

import astroRules from "./rules/astro.mjs";

const config = [
  {
    files: ["**/*.astro"],
    plugins: {
      astro,
    },
    rules: {
      ...astroRules,
    },
  },
];

export default config;
