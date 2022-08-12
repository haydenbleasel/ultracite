module.exports = {
  // root is required for https://github.com/eslint/eslint/issues/13385
  root: true,
  extends: ['prettier'],
  plugins: ['import', 'prettier'],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'prettier/prettier': [
      'error',
      {
        bracketSpacing: true,
        bracketSameLine: false,
        singleQuote: true,
        trailingComma: 'es5',
      }
    ],
    curly: ['error', 'all'],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-use-before-define': ['warn'],
    'object-curly-spacing': ['error', 'always'],
    'space-before-blocks': 'error',
    'dot-notation': 'error',
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      { 
        blankLine: 'any', 
        prev: ['const', 'let', 'var'], 
        next: ['const', 'let', 'var'] 
      },
      { blankLine: 'always', prev: 'directive', next: '*' },
      { blankLine: 'any', prev: 'directive', next: 'directive' },
      { blankLine: 'always', prev: '*', next: 'if' },
      { blankLine: 'always', prev: 'if', next: '*' },
      { blankLine: 'always', prev: '*', next: 'function' },
      { blankLine: 'always', prev: '*', next: 'multiline-expression' },
    ],
    'no-useless-constructor': 'error',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'import/order': [
      'error',
      { groups: ['builtin', 'external', 'parent', 'sibling', 'index'] }
    ],
    'no-irregular-whitespace': ['error', { 'skipComments': true }],
  },
};
