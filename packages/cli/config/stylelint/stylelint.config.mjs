/** @type {import('stylelint').Config} */
const config = {
  extends: ["stylelint-config-standard", "stylelint-config-idiomatic-order"],
  plugins: ["stylelint-prettier"],
  // Alchemy (alchemy.run) writes local state and generated bindings to a
  // .alchemy directory; keep it out of stylelint runs.
  ignoreFiles: ["**/.alchemy/**"],
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
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
  },
};

export default config;
