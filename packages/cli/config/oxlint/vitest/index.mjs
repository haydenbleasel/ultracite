import { defineConfig } from "oxlint";

export default defineConfig({
  overrides: [
    {
      files: [
        "**/*.{test,spec}.{ts,tsx,js,jsx}",
        "**/__tests__/**/*.{ts,tsx,js,jsx}",
      ],
      plugins: ["vitest"],
      rules: {
        "vitest/consistent-each-for": "error",
        "vitest/consistent-test-filename": "error",
        "vitest/consistent-vitest-vi": "error",
        "vitest/expect-expect": "error",
        "vitest/hoisted-apis-on-top": "error",
        "vitest/no-alias-methods": "error",
        "vitest/no-commented-out-tests": "error",
        "vitest/no-conditional-expect": "error",
        "vitest/no-conditional-tests": "error",
        "vitest/no-disabled-tests": "error",
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
        "vitest/prefer-called-exactly-once-with": "error",
        "vitest/prefer-called-once": "error",
        "vitest/prefer-called-with": "error",
        "vitest/prefer-comparison-matcher": "error",
        "vitest/prefer-describe-function-title": "error",
        "vitest/prefer-each": "error",
        "vitest/prefer-equality-matcher": "error",
        "vitest/prefer-expect-resolves": "error",
        "vitest/prefer-expect-type-of": "error",
        "vitest/prefer-hooks-in-order": "error",
        "vitest/prefer-hooks-on-top": "error",
        "vitest/prefer-import-in-mock": "error",
        "vitest/prefer-importing-vitest-globals": "error",
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
        "vitest/require-awaited-expect-poll": "error",
        "vitest/require-local-test-context-for-concurrent-snapshots": "error",
        "vitest/require-mock-type-parameters": "error",
        "vitest/require-to-throw-message": "error",
        "vitest/require-top-level-describe": "error",
        "vitest/valid-describe-callback": "error",
        "vitest/valid-expect": "error",
        "vitest/valid-title": "error",
        "vitest/warn-todo": "error",

        // Disabled: mock callbacks often need empty functions
        "no-empty-function": "off",

        // Disabled: mock factories use Promise.resolve/reject (conflicts with require-await)
        "promise/prefer-await-to-then": "off",

        // Disabled: conflicts with prefer-describe-function-title — function names
        "vitest/prefer-lowercase-title": "off",

        // Conflicts with prefer-to-be-truthy and prefer-to-be-falsy (#645)
        "vitest/prefer-strict-boolean-matchers": "off",

        // Disabled: conflicts with prefer-called-once — both rules enforce opposite styles
        "vitest/prefer-called-times": "off",

        // Disabled: explicit imports are preferred over globals
        "vitest/no-importing-vitest-globals": "off",

        // Disabled: too strict for general use — not all async tests need explicit timeouts
        "vitest/require-test-timeout": "off",
      },
    },
  ],
});
