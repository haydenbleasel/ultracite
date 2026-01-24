import plugin from "@eslint/js";

// Create a new object to avoid mutating the readonly rules object
const baseRules = Object.assign({}, plugin.configs.all.rules);

const overrideRules = {
  "no-unused-private-class-members": "off",
  "capitalized-comments": "off",
  complexity: "off",
  "id-length": ["error", { exceptions: ["x", "y", "z"] }],
  "max-lines": "off",
  "max-lines-per-function": "off",
  "max-params": "off",
  "max-statements": "off",
  "no-ternary": "off",
  "no-undefined": "off",
  "one-var": "off",
  "prefer-destructuring": [
    "error",
    {
      array: false,
      object: true,
    },
  ],
  // https://github.com/eslint/eslint/issues/11542
  "sort-imports": "off",
  "sort-keys": "off",
  "sort-vars": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
