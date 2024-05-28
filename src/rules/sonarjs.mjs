import plugin from 'eslint-plugin-sonarjs';

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`sonarjs/${key}`, 'error'])
);

const overrideRules = {
  'sonarjs/elseif-without-else': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
