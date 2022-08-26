module.exports = {
  // root is required for https://github.com/eslint/eslint/issues/13385
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: ['plugin:import/typescript'],
  plugins: ['@typescript-eslint'],
  rules: {},
};
