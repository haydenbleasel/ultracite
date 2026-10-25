import { defineConfig } from "oxlint";

// Oxlint has no React Native rules; the React Native rules are Biome-only
// (ultracite/biome/react-native). This preset keeps the framework selectable.
export default defineConfig({
  rules: {},
});
