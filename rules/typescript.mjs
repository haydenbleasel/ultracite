import { rules } from '@typescript-eslint/eslint-plugin';

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@typescript-eslint/${key}`, 'error'])
);

const overrideRules = {
  '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'default',
      format: ['camelCase', 'PascalCase', 'snake_case'],
    },
    {
      selector: 'objectLiteralProperty',
      format: null,
      modifiers: ['requiresQuotes'],
    },
  ],
  '@typescript-eslint/no-confusing-void-expression': 'off',
  '@typescript-eslint/no-misused-promises': 'off',
  '@typescript-eslint/no-type-alias': 'off',
  '@typescript-eslint/prefer-readonly': 'off',
  '@typescript-eslint/prefer-readonly-parameter-types': 'off',
  '@typescript-eslint/sort-type-union-intersection-members': 'off',
  '@typescript-eslint/strict-boolean-expressions': 'off',
  '@typescript-eslint/no-magic-numbers': 'off',

  // Disabled for Prettier
  '@typescript-eslint/block-spacing': 'off',
  '@typescript-eslint/brace-style': 'off',
  '@typescript-eslint/comma-dangle': 'off',
  '@typescript-eslint/comma-spacing': 'off',
  '@typescript-eslint/func-call-spacing': 'off',
  '@typescript-eslint/indent': 'off',
  '@typescript-eslint/key-spacing': 'off',
  '@typescript-eslint/keyword-spacing': 'off',
  '@typescript-eslint/lines-around-comment': 'off',
  '@typescript-eslint/lines-between-class-members': 'off',
  '@typescript-eslint/member-delimiter-style': 'off',
  '@typescript-eslint/no-extra-parens': 'off',
  '@typescript-eslint/object-curly-spacing': 'off',
  '@typescript-eslint/padding-line-between-statements': 'off',
  '@typescript-eslint/quotes': 'off',
  '@typescript-eslint/semi': 'off',
  '@typescript-eslint/space-before-blocks': 'off',
  '@typescript-eslint/space-before-function-paren': 'off',
  '@typescript-eslint/space-infix-ops': 'off',
  '@typescript-eslint/type-annotation-spacing': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
