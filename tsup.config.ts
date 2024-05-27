import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['eslint.config.mjs'],
  sourcemap: false,
  minify: true,
  dts: true,
  format: ['esm'],
});
