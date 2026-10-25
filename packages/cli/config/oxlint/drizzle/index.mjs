import { defineConfig } from "oxlint";

// Oxlint has no Drizzle rules; the Drizzle rules are Biome-only
// (ultracite/biome/drizzle). This preset keeps the framework selectable.
export default defineConfig({
  rules: {},
});
