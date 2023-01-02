import { defineConfig } from 'tsup';

export default defineConfig({
  sourcemap: false,
  minify: false,
  dts: false,
  outDir: '.',
  format: ['cjs'],
  loader: {
    '.js': 'jsx',
  },
});
