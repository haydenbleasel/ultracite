/* eslint-disable import/no-anonymous-default-export */

import plugin from '@next/eslint-plugin-next';

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@next/next/${key}`, 'error'])
);

const overrideRules = {};

const config = Object.assign(baseRules, overrideRules);

export default config;
