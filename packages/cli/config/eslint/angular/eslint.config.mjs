/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import angularPlugin from "@angular-eslint/eslint-plugin";
import angularTemplatePlugin from "@angular-eslint/eslint-plugin-template";
import * as angularTemplateParser from "@angular-eslint/template-parser";

import { htmlConfig, scriptConfig } from "../core/eslint.config.mjs";
import inlineScripts, { inlineScriptsFiles } from "./inline-scripts.mjs";
import angularTemplateRules from "./rules/angular-template.mjs";
import angularRules from "./rules/angular.mjs";

// Core's rules read a JavaScript syntax tree, and some of them throw on the
// tree Angular's template parser builds.
const coreRulesOff = Object.fromEntries(
  Object.keys(scriptConfig.rules).map((rule) => [rule, "off"])
);

const angular = [
  {
    files: ["**/*.ts"],
    plugins: {
      "@angular-eslint": angularPlugin,
    },
    // Hands each component's inline `template` to ESLint as an HTML file of
    // its own (`<file>.ts/1_inline-template-<file>.ts-1.component.html`),
    // which the block below lints like an external template. The TypeScript
    // file itself is linted as before.
    processor: angularTemplatePlugin.processors["extract-inline-html"],
    rules: {
      ...angularRules,
    },
  },
  {
    // Every HTML file, not only `*.component.html`: current Angular doesn't
    // name templates that way (51 of the 298 templates in angular.dev's
    // source do). A page that isn't a template, such as `src/index.html`,
    // is read as plain HTML and gets few reports.
    files: ["**/*.html"],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      "@angular-eslint/template": angularTemplatePlugin,
    },
    processor: inlineScripts,
    rules: {
      ...coreRulesOff,
      ...angularTemplateRules,
    },
    settings: {
      // Stops eslint-plugin-html, which core registers for these files, from
      // taking the file over. The inline-scripts block below brings it back.
      "html/html-extensions": [],
    },
  },
  // Core's config for JavaScript and for HTML, for the inline-scripts block.
  { ...scriptConfig, files: inlineScriptsFiles },
  { ...htmlConfig, files: inlineScriptsFiles },
];

export default angular;
