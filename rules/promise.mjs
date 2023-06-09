import plugin from 'eslint-plugin-promise';

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`promise/${key}`, 'error'])
);

const overrideRules = {
  'promise/catch-or-return': ['error', { allowFinally: true }],
  'promise/no-native': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
