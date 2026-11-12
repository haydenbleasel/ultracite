/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import angularPlugin from "@angular-eslint/eslint-plugin";
import angularTemplatePlugin from "@angular-eslint/eslint-plugin-template";
import * as angularTemplateParser from "@angular-eslint/template-parser";

import { version } from "../../shared/version.mjs";
import { htmlConfig, scriptConfig } from "../core/eslint.config.mjs";
import inlineScripts, {
  dropBlockFilenames,
  inlineScriptsFiles,
} from "./inline-scripts.mjs";
import angularTemplateRules from "./rules/angular-template.mjs";
import angularRules from "./rules/angular.mjs";
import withRanges from "./template-parser.mjs";

// Core's rules read a JavaScript syntax tree, and some of them throw on the
// tree Angular's template parser builds. `withRanges` gives its nodes the
// `range` the jsdoc rules read, for when a project's config turns one back on
// for every file. The filename rule reads no syntax tree and stays on, so an
// HTML file's name is checked as it is without this preset.
const coreRulesOff = Object.fromEntries(
  Object.keys(scriptConfig.rules)
    .filter((rule) => rule !== "github/filenames-match-regex")
    .map((rule) => [rule, "off"])
);

const extractInlineHtml =
  angularTemplatePlugin.processors["extract-inline-html"];

// Hands each component's inline `template` to ESLint as an HTML file of its
// own (`<file>.ts/1_inline-template-<file>.ts-1.component.html`), which the
// config for HTML files lints like an external template, and reports what it
// finds in the TypeScript file. The filename rule's reports on an inline
// template are dropped, as the name is ESLint's.
const inlineTemplates = {
  ...extractInlineHtml,
  meta: {
    name: "ultracite/angular-inline-templates",
    version: `${version}+angular-eslint@${angularTemplateParser.version}`,
  },
  postprocess: (blocks, filename) =>
    extractInlineHtml.postprocess(dropBlockFilenames(blocks), filename),
};

const angular = [
  {
    files: ["**/*.ts"],
    plugins: {
      "@angular-eslint": angularPlugin,
    },
    // The TypeScript file itself is linted as before.
    processor: inlineTemplates,
    rules: {
      ...angularRules,
    },
  },
  {
    // Every HTML file, not only `*.component.html`: current Angular doesn't
    // name templates that way (51 of the 298 templates in angular.dev's
    // source do). A whole page, such as `src/index.html`, is linted as one
    // too, without the rules that only fit a template (see the processor).
    files: ["**/*.html"],
    languageOptions: {
      parser: withRanges(angularTemplateParser),
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
