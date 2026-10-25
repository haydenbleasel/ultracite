import { defineConfig } from "oxlint";

// Oxlint has no React Native rules; they are in ultracite/eslint/react-native and
// ultracite/biome/react-native. This preset keeps the framework selectable.
export default defineConfig({
  rules: {},
});
