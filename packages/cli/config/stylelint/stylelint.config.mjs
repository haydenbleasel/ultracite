/** @type {import('stylelint').Config} */
const config = {
  plugins: ["stylelint-prettier"],
  extends: ["stylelint-config-standard", "stylelint-config-idiomatic-order"],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "variants",
          "responsive",
          "screen",
        ],
      },
    ],
    "declaration-property-value-no-unknown": true,
    "no-descending-specificity": null,
    "declaration-block-no-redundant-longhand-properties": [
      true,
      {
        ignoreShorthands: ["/flex/"],
      },
    ],
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
  },
};

export default config;
