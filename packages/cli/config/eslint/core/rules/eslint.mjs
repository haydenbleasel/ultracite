import plugin from "@eslint/js";

// Create a new object to avoid mutating the readonly rules object
const baseRules = { ...plugin.configs.all.rules };

// Overrides mirror the oxlint core config (config/oxlint/core/index.mjs),
// which is the benchmark for rule decisions across linters.
const overrideRules = {
  "capitalized-comments": "off",
  "func-style": ["error", "expression"],
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
  // Each branch of a ternary in a loop condition must be modified inside
  // the loop, not just the expression as a whole.
  "no-unmodified-loop-condition": [
    "error",
    { checkConditionalExpressions: true },
  ],
  // The oxlint convention for "unused on purpose": a leading underscore, a
  // rest sibling, a `using` declaration. JavaScript files only;
  // @typescript-eslint/no-unused-vars takes the same options on TypeScript.
  "no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
      destructuredArrayIgnorePattern: "^_",
      ignoreRestSiblings: true,
      ignoreUsingDeclarations: true,
      varsIgnorePattern: "^_",
    },
  ],
  // `variables: false` skips a reference from inside a function to a variable
  // declared later in an outer scope; functions that call each other have no
  // order that satisfies the default. Matches oxlint.
  "no-use-before-define": ["error", { variables: false }],
  // Avoid conflict with @typescript-eslint/no-floating-promises
  "no-void": ["error", { allowAsStatement: true }],
  // The default terms, plus JSDoc's `@todo` tag. The `*` decoration finds a
  // term behind the leading asterisks of a block comment. Matches oxlint.
  "no-warning-comments": [
    "error",
    { decoration: ["*"], terms: ["todo", "fixme", "xxx", "@todo"] },
  ],
  "one-var": ["error", "never"],
  // https://github.com/eslint/eslint/issues/11542
  "sort-imports": "off",
  // Off, as in oxlint: sorting can change behavior where key order is
  // observable (serialised output, iteration order, `exports` maps, option
  // objects TypeScript infers from in source order).
  // https://www.ultracite.ai/research/sort-keys
  "sort-keys": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
