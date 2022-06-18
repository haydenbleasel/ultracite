module.exports = {
  root: true,
  extends: './eslint.js',
  env: {
    es6: true,
    'react-native/react-native': true,
  },
  globals: {
    __DEV__: true,
  },
  plugins: ['react-native'],
  overrides: [
    {
      files: ['**/*.d.ts'],
      rules: {
        'import/unambiguous': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/ignore': ['react-native'],
  },
  ignorePatterns: ['**/*.js'],
  rules: {
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'error',
    'react-native/no-color-literals': 'error',
    'react-native/no-raw-text': 'error',
    'react-native/no-single-element-style-arrays': 'error',
  },
};
