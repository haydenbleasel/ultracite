/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies */

import drizzlePlugin from "eslint-plugin-drizzle";

import drizzleRules from "./rules/drizzle.mjs";

const drizzle = [
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: {
      drizzle: drizzlePlugin,
    },
    rules: drizzleRules,
  },
];

export default drizzle;
