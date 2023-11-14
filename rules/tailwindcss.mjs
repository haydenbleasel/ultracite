import plugin from 'eslint-plugin-tailwindcss';

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`tailwindcss/${key}`, 'error'])
);

const overrideRules = {
  'tailwindcss/no-arbitrary-value': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
