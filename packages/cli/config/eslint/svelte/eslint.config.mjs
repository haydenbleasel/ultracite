/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import svelte from "eslint-plugin-svelte";
import svelteRules from "./rules/svelte.mjs";

const config = [
  {
    files: ["**/*.svelte"],
    plugins: {
      svelte,
    },
    rules: {
      ...svelteRules,
    },
  },
];

export default config;
