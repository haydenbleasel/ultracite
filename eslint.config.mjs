import harmony from './src/index.mjs';

const config = [
  ...harmony,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];

export default config;
