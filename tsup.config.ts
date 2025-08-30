import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: ['scripts/index.ts'],
  format: ['esm'],
  minify: true,
  outDir: 'dist',
  sourcemap: false,
});
