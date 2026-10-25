import { defineConfig } from "oxlint";

// Oxlint has no Playwright rules; the Playwright rules are Biome-only
// (ultracite/biome/playwright). This preset keeps the framework selectable.
export default defineConfig({
  rules: {},
});
