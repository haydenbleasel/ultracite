import { rules } from 'eslint-plugin-import';

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`import/${key}`, 'error'])
);

const overrideRules = {
  'import/no-unresolved': 'off',
  'import/no-internal-modules': 'off',
  'import/no-relative-parent-imports': 'off',
  'import/no-named-as-default': 'off',
  'import/exports-last': 'off',
  'import/no-namespace': 'off',
  'import/extensions': 'off',
  'import/order': [
    'error',
    {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
        'object',
        'type',
      ],
    },
  ],
  'import/prefer-default-export': 'off',
  'import/max-dependencies': 'off',
  'import/no-unassigned-import': 'off',
  'import/no-default-export': 'off',
  'import/no-named-export': 'off',
  'import/group-exports': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
