import plugin from 'eslint-plugin-storybook';

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`storybook/${key}`, 'error'])
);

const overrideRules = {};

const config = Object.assign(baseRules, overrideRules);

export default config;
