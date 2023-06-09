/* eslint-disable import/no-anonymous-default-export */

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
};

const config = Object.assign(baseRules, overrideRules);

export default config;
