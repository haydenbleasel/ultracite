import plugin from 'eslint-plugin-jsx-a11y';

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`jsx-a11y/${key}`, 'error'])
);

const overrideRules = {
  'jsx-a11y/no-autofocus': 'off',
  'jsx-a11y/label-has-associated-control': [
    'error',
    {
      labelComponents: ['Label'],
      controlComponents: ['Input', 'Select', 'Textarea', 'Checkbox', 'Radio'],
      depth: 3,
    },
  ],
};

const config = Object.assign(baseRules, overrideRules);

export default config;
