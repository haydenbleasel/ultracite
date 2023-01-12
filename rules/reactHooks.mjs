export default {
  // React-Hooks-ESLint
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': [
    'error',
    {
      // Add support for useAsync by react-use
      additionalHooks: '(useAsync)',
    },
  ],
};