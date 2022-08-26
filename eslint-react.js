module.exports = {
  // root is required for https://github.com/eslint/eslint/issues/13385
  root: true,
  extends: ['plugin:react/recommended', 'plugin:react/jsx-runtime'],
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  env: {
    'jest/globals': true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/no-deprecated': ['warn'],
    'react/jsx-uses-react': 'error',   
    'react/jsx-uses-vars': 'error',
  },
};
