/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import cypressPlugin from "eslint-plugin-cypress";

import cypressRules from "./rules/cypress.mjs";

const cypress = [
  {
    // Registers the plugin plus the cy, Cypress, Mocha and Chai globals that
    // specs and support files use without importing them.
    ...cypressPlugin.configs.globals,
    files: [
      "**/*.cy.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
      "**/cypress/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
    ],
    rules: {
      ...cypressRules,
    },
  },
];

export default cypress;
