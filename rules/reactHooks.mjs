/* eslint-disable import/no-anonymous-default-export */

import { rules } from 'eslint-plugin-react-hooks';

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`react-hooks/${key}`, 'error'])
);

const overrideRules = {
  'react-hooks/exhaustive-deps': [
    'error',
    {
      // Add support for useAsync by react-use
      additionalHooks: '(useAsync)',
    },
  ],
};

const config = Object.assign(baseRules, overrideRules);

export default config;
