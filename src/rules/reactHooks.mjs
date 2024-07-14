import { rules } from 'eslint-plugin-react-hooks';

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`react-hooks/${key}`, 'error'])
);

const overrideRules = {
  'react-hooks/exhaustive-deps': 'error',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
