import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: true,
  noExternal: ["@repo/data"],
  outDir: "dist",
  sourcemap: false,
});
