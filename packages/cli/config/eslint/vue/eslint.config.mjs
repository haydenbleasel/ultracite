/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import/no-extraneous-dependencies, id-length */

import vue from "eslint-plugin-vue";

import vueRules from "./rules/vue.mjs";

const config = [
  {
    files: ["**/*.vue"],
    plugins: {
      vue,
    },
    rules: {
      ...vueRules,
    },
  },
];

export default config;
