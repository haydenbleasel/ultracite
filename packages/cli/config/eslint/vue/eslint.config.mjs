/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

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
  {
    files: ["**/*.vue"],
    plugins: {
      vue,
    },
    rules: {
      ...vueRules,
      ...vuePrettierOverrides,
    },
  },
];

export default config;
