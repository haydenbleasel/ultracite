import { defineConfig } from "tsup";

export default defineConfig({
  dts: true,
  entry: ["scripts/index.ts"],
  format: ["esm"],
  minify: true,
  outDir: "dist",
  sourcemap: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
