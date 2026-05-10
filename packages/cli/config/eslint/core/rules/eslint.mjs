import plugin from "@eslint/js";

// Create a new object to avoid mutating the readonly rules object
const baseRules = { ...plugin.configs.all.rules };

const overrideRules = {
  "capitalized-comments": "off",
  "id-length": ["error", { exceptions: ["x", "y", "z"] }],
  "max-lines": "off",
  "max-lines-per-function": "off",
  "max-params": "off",
  "max-statements": "off",
  "no-ternary": "off",
  "no-undefined": "off",
  "one-var": "off",
  // https://github.com/eslint/eslint/issues/11542
  "sort-imports": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
