/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import storybookPlugin from "eslint-plugin-storybook";

import storybookRules from "./rules/storybook.mjs";

const storybook = [
  {
    files: ["**/*.{stories,story}.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: {
      storybook: storybookPlugin,
    },
    rules: {
      ...storybookRules,
    },
  },
];

export default storybook;
