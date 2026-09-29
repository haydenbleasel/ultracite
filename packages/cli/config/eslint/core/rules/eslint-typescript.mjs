const config = {
  // ESLint core rules disabled on TypeScript files because either:
  //  - @typescript-eslint provides an extension rule that understands
  //    TypeScript syntax and is enabled in rules/typescript.mjs
  //    (class-methods-use-this, no-shadow, no-unused-vars, etc.), so the base
  //    rule would report the same problem twice and ignore the extension's
  //    TypeScript-aware options, OR
  //  - the TypeScript compiler already performs the check (no-undef), OR
  //  - Prettier/Oxfmt owns formatting (brace-style, indent, semi, quotes, etc.)
  "brace-style": "off",
  camelcase: "off",
  "class-methods-use-this": "off",
  "comma-dangle": "off",
  "comma-spacing": "off",
  "consistent-return": "off",
  "default-param-last": "off",
  "dot-notation": "off",
  "func-call-spacing": "off",
  indent: "off",
  "init-declarations": "off",
  "keyword-spacing": "off",
  "lines-between-class-members": "off",
  "no-array-constructor": "off",
  "no-dupe-class-members": "off",
  "no-empty-function": "off",
  "no-extra-parens": "off",
  "no-extra-semi": "off",
  "no-implied-eval": "off",
  "no-invalid-this": "off",
  "no-magic-numbers": "off",
  "no-redeclare": "off",
  "no-return-await": "off",
  "no-shadow": "off",
  "no-throw-literal": "off",
  // TypeScript reports unresolved identifiers itself, and this rule does not
  // know about ambient type-only globals such as the `NodeJS` namespace
  // (https://typescript-eslint.io/troubleshooting/faqs/eslint#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors).
  "no-undef": "off",
  "no-unused-expressions": "off",
  "no-unused-private-class-members": "off",
  "no-unused-vars": "off",
  "no-use-before-define": "off",
  "no-useless-constructor": "off",
  "object-curly-spacing": "off",
  "padding-line-between-statements": "off",
  "prefer-destructuring": "off",
  "prefer-promise-reject-errors": "off",
  quotes: "off",
  "require-await": "off",
  semi: "off",
  // The sonarjs equivalent of no-undef, with the same false positives on
  // ambient type-only globals; the TypeScript compiler covers it.
  "sonarjs/no-reference-error": "off",
  "space-before-function-paren": "off",
  "space-infix-ops": "off",
};

export default config;
