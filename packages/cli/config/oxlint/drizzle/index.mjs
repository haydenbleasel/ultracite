import { defineConfig } from "oxlint";

// Oxlint has no Drizzle rules; they are in ultracite/eslint/drizzle and
// ultracite/biome/drizzle. This preset keeps the framework selectable.
export default defineConfig({
  rules: {},
});
