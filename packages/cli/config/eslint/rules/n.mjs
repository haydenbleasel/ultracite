import plugin from 'eslint-plugin-n';

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`n/${key}`, 'error'])
);

const overrideRules = {
  'n/no-missing-import': 'off',
  'n/no-unsupported-features/es-builtins': 'off',
  'n/no-unsupported-features/es-syntax': 'off',
  'n/no-unsupported-features/node-builtins': 'off',
  'n/file-extension-in-import': 'off',
  'n/no-process-env': 'off',
};

const config = Object.assign(baseRules, overrideRules);

export default config;
