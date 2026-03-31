import type { OxlintConfig } from "oxlint";

const testFiles = [
  "**/*.{test,spec}.{ts,tsx,js,jsx}",
  "**/__tests__/**/*.{ts,tsx,js,jsx}",
];

export const angular = {
  rules: {},
} satisfies OxlintConfig;

export const astro = {
  rules: {},
} satisfies OxlintConfig;

export const core = {
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
    "import",
    "jsdoc",
    "node",
    "promise",
  ],
  env: {
    browser: true,
  },
  categories: {
    correctness: "error",
    perf: "error",
    restriction: "error",
    suspicious: "error",
    pedantic: "error",
    style: "error",
  },
  rules: {
    "no-await-in-loop": "off",
    "max-lines-per-function": "off",
    "no-implicit-coercion": "off",
    "no-magic-numbers": "off",
    "no-console": "off",
    "no-ternary": "off",
    "no-undefined": "off",
    "max-lines": "off",
    "id-length": "off",
    "func-style": [
      "error",
      "expression",
      {
        allowArrowFunctions: true,
      },
    ],
    "arrow-body-style": ["error", "as-needed"],
    "max-depth": "off",
    "max-params": "off",
    "max-statements": "off",
    "capitalized-comments": "off",
    "new-cap": "off",
    "no-continue": "off",
    "init-declarations": "off",
    // Rely on oxfmt `experimentalSortImports` instead.
    "sort-imports": "off",
    "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
    // Avoid conflict with typescript/no-floating-promises.
    "no-void": ["error", { allowAsStatement: true }],

    "import/no-relative-parent-imports": "off",
    "import/no-default-export": "off",
    "import/exports-last": "off",
    "import/no-named-export": "off",
    "import/max-dependencies": "off",
    "import/no-unresolved": "off",
    "import/extensions": "off",
    "import/no-namespace": "off",
    "import/no-anonymous-default-export": "off",
    "import/prefer-default-export": "off",
    "import/group-exports": "off",
    "import/no-commonjs": "off",
    "import/unambiguous": "off",
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
    "import/no-dynamic-require": "off",
    "import/no-unassigned-import": "off",
    "import/no-nodejs-modules": "off",

    "jsdoc/require-param": "off",
    "jsdoc/require-param-type": "off",
    "jsdoc/require-returns": "off",
    "jsdoc/require-returns-type": "off",

    "unicorn/explicit-length-check": "off",
    "unicorn/no-array-callback-reference": "off",
    "unicorn/no-process-exit": "off",
    "unicorn/prefer-global-this": "off",
    "unicorn/no-null": "off",
    "unicorn/prefer-top-level-await": "off",
    "unicorn/prefer-string-raw": "off",

    "typescript/explicit-module-boundary-types": "off",
    "typescript/no-require-imports": "off",
    "typescript/explicit-function-return-type": "off",
    "typescript/no-var-requires": "off",
    "typescript/require-await": "off",

    "node/no-process-env": "off",

    "oxc/no-map-spread": "off",
    "oxc/no-async-await": "off",
    "oxc/no-rest-spread-properties": "off",
    "oxc/no-optional-chaining": "off",

    "promise/catch-or-return": "off",
    "promise/always-return": "off",
  },
  overrides: [
    {
      // Shared test file overrides. Framework-specific test rules live in
      // separate jest/ and vitest/ configs to avoid conflicts.
      files: testFiles,
      rules: {
        // Mock callbacks often need empty functions.
        "no-empty-function": "off",
        // Mock factories use Promise.resolve/reject.
        "promise/prefer-await-to-then": "off",
      },
    },
  ],
} satisfies OxlintConfig;

export const jest = {
  overrides: [
    {
      files: testFiles,
      plugins: ["jest"],
      rules: {
        // bun:test mock.module() must be called at top level.
        "jest/require-hook": "off",
        // Mock factories use conditionals for path-based routing.
        "jest/no-conditional-in-test": "off",
        // bun:test uses beforeEach hooks for mock.restore().
        "jest/no-hooks": "off",
        // Mock factories return Promise.resolve/reject.
        "promise/prefer-await-to-then": "off",
        // Mock callbacks often need empty functions.
        "no-empty-function": "off",

        "jest/consistent-test-it": "error",
        "jest/expect-expect": "error",
        "jest/max-expects": "error",
        "jest/max-nested-describe": "error",
        "jest/no-alias-methods": "error",
        "jest/no-commented-out-tests": "error",
        "jest/no-conditional-expect": "error",
        "jest/no-confusing-set-timeout": "error",
        "jest/no-deprecated-functions": "error",
        "jest/no-disabled-tests": "error",
        "jest/no-done-callback": "error",
        "jest/no-duplicate-hooks": "error",
        "jest/no-export": "error",
        "jest/no-focused-tests": "error",
        "jest/no-identical-title": "error",
        "jest/no-interpolation-in-snapshots": "error",
        "jest/no-jasmine-globals": "error",
        "jest/no-large-snapshots": "error",
        "jest/no-mocks-import": "error",
        "jest/no-restricted-jest-methods": "error",
        "jest/no-restricted-matchers": "error",
        "jest/no-standalone-expect": "error",
        "jest/no-test-prefixes": "error",
        "jest/no-test-return-statement": "error",
        "jest/no-untyped-mock-factory": "error",
        "jest/padding-around-test-blocks": "error",
        "jest/prefer-called-with": "error",
        "jest/prefer-comparison-matcher": "error",
        "jest/prefer-each": "error",
        "jest/prefer-equality-matcher": "error",
        "jest/prefer-expect-resolves": "error",
        "jest/prefer-hooks-in-order": "error",
        "jest/prefer-hooks-on-top": "error",
        "jest/prefer-jest-mocked": "error",
        "jest/prefer-lowercase-title": "error",
        "jest/prefer-mock-promise-shorthand": "error",
        "jest/prefer-spy-on": "error",
        "jest/prefer-strict-equal": "error",
        "jest/prefer-to-be": "error",
        "jest/prefer-to-contain": "error",
        "jest/prefer-to-have-been-called": "error",
        "jest/prefer-to-have-been-called-times": "error",
        "jest/prefer-to-have-length": "error",
        "jest/prefer-todo": "error",
        "jest/require-to-throw-message": "error",
        "jest/require-top-level-describe": "error",
        "jest/valid-describe-callback": "error",
        "jest/valid-expect": "error",
        "jest/valid-title": "error",
      },
    },
  ],
} satisfies OxlintConfig;

export const nestjs = {
  rules: {},
} satisfies OxlintConfig;

export const next = {
  plugins: ["nextjs"],
  rules: {},
  overrides: [
    {
      files: ["**/next-env.d.ts"],
      rules: {
        "import/no-unassigned-import": "off",
      },
    },
  ],
} satisfies OxlintConfig;

export const qwik = {
  rules: {},
} satisfies OxlintConfig;

export const react = {
  plugins: ["react", "react-perf", "jsx-a11y"],
  rules: {
    "react/only-export-components": "off",
    "react/jsx-boolean-value": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-filename-extension": "off",
    "react/no-unknown-property": "off",
    "react/jsx-props-no-spreading": "off",
    "react/jsx-max-depth": "off",
    "react/no-multi-comp": "off",

    "react-perf/jsx-no-jsx-as-prop": "off",
    "react-perf/jsx-no-new-object-as-prop": "off",
    "react-perf/jsx-no-new-array-as-prop": "off",

    "jsx-a11y/no-autofocus": "off",
  },
} satisfies OxlintConfig;

export const remix = {
  overrides: [
    {
      files: ["**/routeTree.gen.ts"],
      rules: {
        "unicorn/filename-case": "off",
        "unicorn/no-abusive-eslint-disable": "off",
      },
    },
  ],
  rules: {},
} satisfies OxlintConfig;

export const solid = {
  rules: {},
} satisfies OxlintConfig;

export const svelte = {
  rules: {},
} satisfies OxlintConfig;

export const vitest = {
  overrides: [
    {
      files: testFiles,
      plugins: ["vitest"],
      rules: {
        // Mock callbacks often need empty functions.
        "no-empty-function": "off",
        // Mock factories use Promise.resolve/reject.
        "promise/prefer-await-to-then": "off",

        "vitest/consistent-test-filename": "error",
        "vitest/consistent-vitest-vi": "error",
        "vitest/expect-expect": "error",
        "vitest/no-alias-methods": "error",
        "vitest/no-commented-out-tests": "error",
        "vitest/no-conditional-expect": "error",
        "vitest/no-conditional-tests": "error",
        "vitest/no-disabled-tests": "error",
        "vitest/no-done-callback": "error",
        "vitest/no-duplicate-hooks": "error",
        "vitest/no-focused-tests": "error",
        "vitest/no-identical-title": "error",
        "vitest/no-import-node-test": "error",
        "vitest/no-interpolation-in-snapshots": "error",
        "vitest/no-large-snapshots": "error",
        "vitest/no-mocks-import": "error",
        "vitest/no-restricted-matchers": "error",
        "vitest/no-restricted-vi-methods": "error",
        "vitest/no-standalone-expect": "error",
        "vitest/no-test-prefixes": "error",
        "vitest/no-test-return-statement": "error",
        "vitest/prefer-called-with": "error",
        // This conflicts with prefer-called-once, which enforces the opposite
        // matcher style.
        "vitest/prefer-called-times": "off",
        "vitest/prefer-comparison-matcher": "error",
        "vitest/prefer-each": "error",
        "vitest/prefer-equality-matcher": "error",
        "vitest/prefer-expect-resolves": "error",
        "vitest/prefer-hooks-in-order": "error",
        "vitest/prefer-hooks-on-top": "error",
        "vitest/prefer-lowercase-title": "error",
        "vitest/prefer-mock-promise-shorthand": "error",
        "vitest/prefer-spy-on": "error",
        "vitest/prefer-strict-equal": "error",
        "vitest/prefer-to-be": "error",
        "vitest/prefer-to-be-falsy": "error",
        "vitest/prefer-to-be-object": "error",
        "vitest/prefer-to-be-truthy": "error",
        "vitest/prefer-to-contain": "error",
        "vitest/prefer-to-have-length": "error",
        "vitest/prefer-todo": "error",
        "vitest/require-local-test-context-for-concurrent-snapshots": "error",
        "vitest/require-to-throw-message": "error",
        "vitest/require-top-level-describe": "error",
        "vitest/valid-describe-callback": "error",
        "vitest/valid-expect": "error",
        "vitest/valid-title": "error",
        "vitest/warn-todo": "error",
      },
    },
  ],
} satisfies OxlintConfig;

export const vue = {
  plugins: ["vue"],
  rules: {},
} satisfies OxlintConfig;

export const configs = {
  angular,
  astro,
  core,
  jest,
  nestjs,
  next,
  qwik,
  react,
  remix,
  solid,
  svelte,
  vitest,
  vue,
};
