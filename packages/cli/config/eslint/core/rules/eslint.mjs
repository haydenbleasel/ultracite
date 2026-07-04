import plugin from "@eslint/js";

// Create a new object to avoid mutating the readonly rules object
const baseRules = { ...plugin.configs.all.rules };

// Overrides mirror the oxlint core config (config/oxlint/core/index.mjs),
// which is the benchmark for rule decisions across linters.
const overrideRules = {
  "capitalized-comments": "off",
  "func-style": ["error", "expression", { allowArrowFunctions: true }],
  "id-length": "off",
  "init-declarations": "off",
  "max-depth": "off",
  "max-lines": "off",
  "max-lines-per-function": "off",
  "max-params": "off",
  "max-statements": "off",
  "new-cap": "off",
  "no-console": "off",
  "no-continue": "off",
  "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
  "no-implicit-coercion": "off",
  "no-restricted-properties": "off",
  "no-ternary": "off",
  "no-undefined": "off",
  "no-underscore-dangle": "off",
  // Avoid conflict with @typescript-eslint/no-floating-promises
  "no-void": ["error", { allowAsStatement: true }],
  "one-var": "off",
  // https://github.com/eslint/eslint/issues/11542
  "sort-imports": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
