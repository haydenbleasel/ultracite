import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['eslint.config.mjs', 'prettier.js', 'stylelint.js'],
  sourcemap: false,
  minify: true,
  dts: true,
  format: ['esm'],
  splitting: false,
});
