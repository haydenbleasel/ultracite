import { defineConfig } from "tsup";

const sharedConfig = {
  dts: true,
  format: ["esm"] as const,
  minify: true,
  noExternal: ["@repo/data"],
  outDir: "dist",
  sourcemap: false,
};

export default [
  defineConfig({
    ...sharedConfig,
    banner: {
      js: "#!/usr/bin/env node",
    },
    entry: {
      index: "src/index.ts",
    },
  }),
  defineConfig({
    ...sharedConfig,
    entry: {
      oxlint: "src/oxlint.ts",
    },
  }),
];
