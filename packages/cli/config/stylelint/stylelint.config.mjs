/** @type {import('stylelint').Config} */
const config = {
  extends: ["stylelint-config-standard", "stylelint-config-idiomatic-order"],
  plugins: ["stylelint-prettier"],
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
          "source",
          "reference",
        ],
      },
    ],
    "declaration-block-no-redundant-longhand-properties": [
      true,
      {
        ignoreShorthands: ["/flex/"],
      },
    ],
    "declaration-property-value-no-unknown": true,
    "display-notation": "short",
    "no-descending-specificity": null,
    // The *-layout-mappings rules (property, unit, value-keyword) are left
    // off: they reject every physical property, unit and keyword (margin-left,
    // vw, float: left) and can only autofix with a per-project
    // languageOptions.directionality setting.
    "relative-selector-nesting-notation": "explicit",
    "selector-no-deprecated": true,
    "selector-no-invalid": true,
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
  },
};

export default config;
