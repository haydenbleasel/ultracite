import typescript from "@typescript-eslint/eslint-plugin";
// biome-ignore lint/performance/noNamespaceImport: Required for ESLint parser compatibility
import * as typescriptParser from "@typescript-eslint/parser"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint parser compatibility
import eslintPrettier from "eslint-config-prettier";
// biome-ignore lint/performance/noNamespaceImport: Required for ESLint plugin compatibility
import * as importTypescriptResolver from "eslint-import-resolver-typescript"; // oxlint-disable-line sonarjs/no-wildcard-import -- required for ESLint resolver compatibility
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
    files: [
      "**/*.js",
      "**/*.ts",
      "**/*.json",
      "**/*.mjs",
      "**/*.cjs",
      "**/*.html",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
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
      ...eslintPrettier.rules,
      // eslint-config-prettier disables these defensively, but they don't
      // conflict with our Prettier settings and the oxlint config enforces
      // them alongside oxfmt.
      curly: "error",
      "no-unexpected-multiline": "error",
      ...unusedImportsRules,
      ...sonarjsRules,
      ...compatRules,
      ...unicornRules,
      ...githubRules,
    },

    settings: {
      "import-x/parsers": {
        espree: [".js", ".cjs", ".mjs", ".ts"],
      },
      "import-x/resolver": {
        node: true,
        typescript: true,
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      "import/typescript": importTypescriptResolver,
    },
    rules: {
      ...eslintTypescriptRules,
      ...typescriptRules,
    },
  },
  {
    files: ["**/*.cy.js"],
    languageOptions: {
      globals: {
        ...globals.cypress,
      },
    },
    plugins: {
      cypress,
    },
    rules: {
      ...cypressRules,
    },
  },
  {
    files: ["**/*.stories.js", "**/*.stories.ts"],
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
      "**/*.{test,spec}.{ts,tsx,js,jsx}",
      "**/__tests__/**/*.{ts,tsx,js,jsx}",
    ],
    rules: {
      "sonarjs/no-duplicate-string": "off",
    },
  },
];

export default config;
