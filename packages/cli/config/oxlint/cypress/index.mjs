import { defineConfig } from "oxlint";

// Oxlint has no Cypress rules; the Cypress rules are ESLint-only
// (ultracite/eslint/cypress). This preset keeps the framework selectable.
export default defineConfig({
  rules: {},
});
