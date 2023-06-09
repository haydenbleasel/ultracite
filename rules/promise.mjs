/* eslint-disable import/no-anonymous-default-export */

import eslintPluginPromise from 'eslint-plugin-promise';

const { rules } = eslintPluginPromise;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`react/${key}`, 'error'])
);

const overrideRules = {
  'promise/catch-or-return': ['error', { allowFinally: true }],
  'promise/no-native': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
