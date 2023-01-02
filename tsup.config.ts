import { defineConfig } from 'tsup';

export default defineConfig({
  sourcemap: false,
  minify: true,
  dts: true,
  format: ['cjs'],
  loader: {
    '.js': 'jsx',
  },
});
