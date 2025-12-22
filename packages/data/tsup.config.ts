import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/agents.ts",
    "src/editors.ts",
    "src/providers.ts",
    "src/options.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
});
