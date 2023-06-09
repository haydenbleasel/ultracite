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
  '@typescript-eslint/no-extra-parens': 'off',
  '@typescript-eslint/no-magic-numbers': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
