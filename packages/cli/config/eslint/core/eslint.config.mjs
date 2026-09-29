import typescript from "@typescript-eslint/eslint-plugin";
// biome-ignore lint/performance/noNamespaceImport: Required for ESLint parser compatibility
import * as typescriptParser from "@typescript-eslint/parser"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint parser compatibility
import eslintPrettier from "eslint-config-prettier";
import compat from "eslint-plugin-compat";
import cypress from "eslint-plugin-cypress";
import github from "eslint-plugin-github";
import html from "eslint-plugin-html";
import { importX } from "eslint-plugin-import-x";
import jsdocPlugin from "eslint-plugin-jsdoc";
import n from "eslint-plugin-n";
import prettier from "eslint-plugin-prettier";
import promise from "eslint-plugin-promise";
import sonarjs from "eslint-plugin-sonarjs";
import storybook from "eslint-plugin-storybook";
import unicorn from "eslint-plugin-unicorn";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

import { ignorePatterns } from "../../shared/ignores.mjs";
import compatRules from "./rules/compat.mjs";
import cypressRules from "./rules/cypress.mjs";
import eslintTypescriptRules from "./rules/eslint-typescript.mjs";
import eslintRules from "./rules/eslint.mjs";
import githubRules from "./rules/github.mjs";
import importRules from "./rules/import.mjs";
import jsdocRules from "./rules/jsdoc.mjs";
import nRules from "./rules/n.mjs";
import prettierRules from "./rules/prettier.mjs";
import promiseRules from "./rules/promise.mjs";
import sonarjsRules from "./rules/sonarjs.mjs";
import storybookRules from "./rules/storybook.mjs";
import typescriptRules from "./rules/typescript.mjs";
import unicornRules from "./rules/unicorn.mjs";
import unusedImportsRules from "./rules/unused-imports.mjs";

const config = [
  importX.flatConfigs.typescript,
  {
    ignores: ignorePatterns,
  },
  {
    // Every JavaScript and TypeScript module extension, plus inline scripts
    // in HTML. JSON is deliberately absent: espree cannot parse it, and the
    // oxlint benchmark does not lint JSON either.
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}", "**/*.html"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      sourceType: "module",
    },
    plugins: {
      compat,
      github,
      "import-x": importX,
      jsdoc: jsdocPlugin,
      n,
      prettier,
      promise,
      sonarjs,
      unicorn,
      "unused-imports": unusedImports,
    },
    rules: {
      ...eslintRules,
      ...importRules,
      ...jsdocRules,
      ...promiseRules,
      ...nRules,
      ...prettierRules,
      ...unusedImportsRules,
      ...sonarjsRules,
      ...compatRules,
      ...unicornRules,
      ...githubRules,
      // eslint-config-prettier goes after every plugin spread: the all-on
      // plugin rule sets would otherwise re-enable the formatting rules it
      // turns off. unicorn/number-literal-case was the visible casualty —
      // it demands `0xABCD` while Prettier prints `0xabcd`, so no hex
      // literal could satisfy both.
      ...eslintPrettier.rules,
      // eslint-config-prettier disables these defensively, but they don't
      // conflict with our Prettier settings and the oxlint config enforces
      // them alongside oxfmt.
      curly: "error",
      "no-unexpected-multiline": "error",
      // Prettier prints empty braces as `{}` too, so this cannot fight it.
      "unicorn/empty-brace-spaces": "error",
    },

    settings: {
      // TypeScript extensions are mapped to @typescript-eslint/parser by
      // importX.flatConfigs.typescript above.
      "import-x/parsers": {
        espree: [".js", ".jsx", ".cjs", ".mjs"],
      },
      "import-x/resolver": {
        node: true,
        typescript: true,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        // The project service finds the nearest tsconfig for each file, so
        // solution-style configs (`"files": []` plus `references`, as in the
        // Vite templates) and monorepo packages get type information. A
        // fixed `project: "./tsconfig.json"` failed every file in those
        // layouts.
        projectService: true,
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      ...eslintTypescriptRules,
      ...typescriptRules,
    },
  },
  {
    // Registers the plugin plus the cy, Cypress, Mocha and Chai globals that
    // specs and support files use without importing them.
    ...cypress.configs.globals,
    files: [
      "**/*.cy.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
      "**/cypress/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
    ],
    rules: {
      ...cypressRules,
    },
  },
  {
    files: ["**/*.{stories,story}.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: {
      storybook,
    },
    rules: {
      ...storybookRules,
    },
  },
  {
    files: ["**/*.html"],
    plugins: {
      html,
    },
    settings: {
      "html/javascript-tag-names": ["script", "Script"],
    },
  },
  {
    // Repeated string literals (test titles, expected values) are normal and
    // idiomatic in test files. Mirrors the oxlint core test override.
    files: [
      "**/*.{test,spec,test-d,spec-d}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
      "**/__tests__/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
    ],
    rules: {
      "sonarjs/no-duplicate-string": "off",
    },
  },
];

export default config;
