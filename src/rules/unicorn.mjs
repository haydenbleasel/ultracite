import plugin from 'eslint-plugin-unicorn';

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`unicorn/${key}`, 'error'])
);

const overrideRules = {
  'unicorn/no-keyword-prefix': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
