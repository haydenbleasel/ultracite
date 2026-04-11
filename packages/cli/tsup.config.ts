import type { Options } from "tsup";
import { defineConfig } from "tsup";

const sharedConfig: Options = {
  dts: true,
  format: ["esm"],
  minify: true,
  noExternal: ["@repo/data"],
  outDir: "dist",
  sourcemap: false,
};

export default defineConfig({
  ...sharedConfig,
  banner: {
    js: "#!/usr/bin/env node",
  },
  entry: {
    index: "src/index.ts",
  },
});
