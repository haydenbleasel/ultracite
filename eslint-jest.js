module.exports = {
  // root is required for https://github.com/eslint/eslint/issues/13385
  root: true,
  extends: [
    'plugin:jest/recommended',
  ],
  plugins: ['jest'],
  env: {
    'jest/globals': true,
  },
  rules: {
    'jest/prefer-lowercase-title': [
      'error',
      {
        ignore: ['describe', 'test']
      }
    ],
    'jest/consistent-test-it': [
      'error', 
      {
        fn: 'test', 
        withinDescribe: 'it',
      }
    ]
  },
};
