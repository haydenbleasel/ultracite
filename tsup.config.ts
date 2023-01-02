import { defineConfig } from 'tsup';

export default defineConfig({
  sourcemap: false,
  minify: false,
  dts: false,
  outDir: '.',
  entry: ['eslint.config.ts'],
  format: ['cjs'],
  loader: {
    '.js': 'jsx',
  },
});
