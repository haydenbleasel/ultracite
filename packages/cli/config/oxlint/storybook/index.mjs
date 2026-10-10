import { defineConfig } from "oxlint";

// Oxlint has no Storybook rules; the Storybook rules are ESLint-only
// (ultracite/eslint/storybook). This preset keeps the framework selectable.
export default defineConfig({
  rules: {},
});
