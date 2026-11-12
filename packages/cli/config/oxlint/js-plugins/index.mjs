import { defineConfig } from "oxlint";

import {
  PAGE_ROUTE_FILENAME_PATTERN,
  ROUTE_FILE_GLOB,
} from "../../shared/route-filenames.mjs";

// eslint-plugin-github, eslint-plugin-jsdoc, eslint-plugin-sonarjs,
// eslint-plugin-tsdoc, and oxlint-plugin-react-doctor run through oxlint's JS
// plugin support to close the gap with the ESLint preset and to add opt-in
// TSDoc/public API checks and React Doctor's extra checks. This preset is
// opt-in: extend it alongside core (and any framework preset) only when you
// want those rules and accept the extra dependencies plus the slower JS-plugin
// lint pass. Rules that require type information are not supported by the JS
// plugin bridge and are excluded. React Doctor's rules once lived in the
// react/next/tanstack presets; they live here now so those framework presets
// run entirely on oxlint's native Rust rules. Framework-specific react-doctor
// rules (Next.js, TanStack) are NOT included here — they fire on generic JSX
// and would false-positive in other frameworks. Extend
// ultracite/oxlint/next/js-plugins or ultracite/oxlint/tanstack/js-plugins
// alongside this preset when using those frameworks.
//
// Install the base plugins in your project, then extend the preset:
//
//   npm install -D eslint-plugin-github eslint-plugin-sonarjs oxlint-plugin-react-doctor
//
//   import { defineConfig } from "oxlint";
//   import core from "ultracite/oxlint/core";
//   import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";
//
//   export default defineConfig({
//     extends: [core, jsPlugins],
//     ignorePatterns: core.ignorePatterns,
//     jsPlugins: jsPlugins.jsPlugins,
//     settings: jsPluginSettings,
//   });
//
// `jsPlugins: jsPlugins.jsPlugins` re-declares the plugin packages on the
// root config: oxlint loads them from the extended preset either way, but
// dependency analyzers such as Knip only read `jsPlugins` off the root and
// would otherwise flag the packages as unused (#784).
//
// To enable only some of the plugins, extend selectJsPlugins(...) instead of
// the full preset — see its doc comment below.
const jsPluginEntries = [
  { name: "github", specifier: "eslint-plugin-github" },
  { name: "sonarjs", specifier: "eslint-plugin-sonarjs" },
  { name: "react-doctor", specifier: "oxlint-plugin-react-doctor" },
];

// These documentation plugins are selected separately so upgrading a project
// that already extends the full js-plugins preset does not add dependencies
// without an explicit opt-in.
const documentationPluginEntries = [
  { name: "jsdoc-js", specifier: "eslint-plugin-jsdoc" },
  { name: "tsdoc", specifier: "eslint-plugin-tsdoc" },
];

const exportDeclaration =
  ":matches(ExportNamedDeclaration, ExportDefaultDeclaration)";

const publicMember =
  ':not([accessibility="private"], [accessibility="protected"], [key.type="PrivateIdentifier"], [kind="set"])';

// The exported declarations that make up a module's public API, as explicit
// selectors rather than require-jsdoc's publicOnly option: Oxlint's AST gives
// a class member without an access modifier `accessibility: null`, which
// publicOnly reads as private, so it would only check members marked
// `public`. Setters are skipped because TSDoc documents an accessor pair on
// its getter.
const publicApiContexts = [
  `${exportDeclaration} > :matches(ClassDeclaration, FunctionDeclaration)`,
  "ExportNamedDeclaration > :matches(TSDeclareFunction, TSEnumDeclaration, TSInterfaceDeclaration, TSTypeAliasDeclaration)",
  "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, ClassExpression, FunctionExpression)",
  "ExportDefaultDeclaration > :matches(ArrowFunctionExpression, ClassExpression, FunctionExpression)",
  // A function passed to a wrapper, e.g. forwardRef(...), memo(...) or
  // createServerFn().handler(...).
  'ExportNamedDeclaration[declaration.declarations.0.init.type="CallExpression"][declaration.declarations.0.init.arguments.0.type=/FunctionExpression$/]',
  'ExportDefaultDeclaration[declaration.type="CallExpression"][declaration.arguments.0.type=/FunctionExpression$/]',
  `${exportDeclaration} > ClassDeclaration > ClassBody > :matches(MethodDefinition, TSAbstractMethodDefinition)${publicMember}`,
];

// TSDoc's standard tags that JSDoc doesn't define, which core's
// jsdoc/check-tag-names would otherwise reject.
const tsdocOnlyTags = [
  "alpha",
  "beta",
  "decorator",
  "defaultValue",
  "eventProperty",
  "experimental",
  "packageDocumentation",
  "privateRemarks",
  "remarks",
  "sealed",
  "typeParam",
  "virtual",
];

// The TypeScript override for the selected documentation plugins. Core's
// native jsdoc/* rules keep checking comment content; this adds the selected
// plugins' rules and adjusts the native ones so every combination can be
// satisfied.
const buildDocumentationOverride = (names) => {
  const rules = {};

  if (names.has("jsdoc-js")) {
    // Only the missing-docs check is bridged; it has no native equivalent.
    // FunctionDeclaration is required by default, exported or not.
    rules["jsdoc-js/require-jsdoc"] = [
      "error",
      { contexts: publicApiContexts, require: { FunctionDeclaration: false } },
    ];
    // Core leaves these off. Every JSDoc block on a function, exported or
    // not, must describe its parameters and return value; core keeps the
    // *-type rules off, so TypeScript types aren't repeated. TSDoc has no
    // dotted names for destructured properties (`@param options.a`), so with
    // it selected only the parameter itself is documented.
    rules["jsdoc/require-param"] = names.has("tsdoc")
      ? ["error", { checkDestructured: false }]
      : "error";
    rules["jsdoc/require-returns"] = "error";
  }

  if (names.has("tsdoc")) {
    rules["jsdoc/check-tag-names"] = ["error", { definedTags: tsdocOnlyTags }];
    // TSDoc has no @yields tag, so a generator's docs can't satisfy both.
    // require-yields-type would also want a `{Type}`, which TSDoc rejects
    // even when tsdoc.json defines @yields.
    rules["jsdoc/require-yields"] = "off";
    rules["jsdoc/require-yields-type"] = "off";
    rules["tsdoc/syntax"] = "error";
  }

  return { files: ["**/*.{ts,tsx,mts,cts}"], rules };
};

// react-doctor 0.9.x rewrote its ported oxc/react-refresh rules (notably
// only-export-components) with a stripped-down default mode: no framework
// detection, no route-file skipping, and allowConstantExport off — so Next.js
// route-segment exports (`export const dynamic = ...`, metadata, etc.)
// false-positive in every route file (#771). "curated" restores the
// framework-aware behavior these rule selections were curated against.
//
// oxlint does not merge `settings` from extended configs, so this preset
// carrying the settings is not enough — they must land on the root config:
//
//   export default defineConfig({
//     extends: [core, jsPlugins],
//     ignorePatterns: core.ignorePatterns,
//     settings: jsPluginSettings,
//   });
//
// `ultracite init` wires this into generated configs automatically.
export const jsPluginSettings = {
  "react-doctor": {
    portedRuleMode: "curated",
  },
};

const config = defineConfig({
  jsPlugins: jsPluginEntries,
  // Inert until oxlint merges settings from extends; the root config applies
  // jsPluginSettings itself (see above).
  settings: jsPluginSettings,
  overrides: [
    {
      files: [
        "**/*.{test,spec,test-d,spec-d}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
        "**/__tests__/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
      ],
      rules: {
        // Repeated string literals (test titles, expected values) are normal
        // and idiomatic in test files.
        "sonarjs/no-duplicate-string": "off",
      },
    },
    {
      files: [ROUTE_FILE_GLOB],
      rules: {
        // File-based routers (TanStack Router, React Router, SvelteKit)
        // encode routing in the filename: `__root.tsx`, `$.tsx`,
        // `posts.$postId.tsx`, `_layout.tsx`, `{-$slug}.tsx`, `+page.ts`.
        // The GitHub kebab-case regex cannot
        // express that grammar, and the tanstack preset already exempts these
        // globs from unicorn/filename-case for the same reason (#799). This
        // lives here rather than in tanstack/js-plugins because selectJsPlugins
        // filters override rules by plugin; an override naming `github/*` from
        // a separately extended preset fails config parsing when the github
        // plugin was not selected.
        "github/filenames-match-regex": "off",
      },
    },
    {
      files: ["**/pages/**/*.{astro,js,jsx,mjs,mts,ts,tsx,vue}"],
      rules: {
        // Astro and Next.js (pages router) encode dynamic, rest and optional
        // route parameters in bracketed page filenames: `[slug].astro`,
        // `[...slug].astro`, `[[...slug]].tsx`, `[lang]-[version].astro`
        // (#804), and Next.js requires `_app`, `_document` and `_error`.
        // Rather than switching the rule off, pass a route-aware regex so
        // non-route names in `pages/` (`BadPage.ts`) are still rejected. Like
        // the default, one extra dotted segment is allowed for endpoints such
        // as `rss.xml.ts` and `[slug].json.ts`.
        "github/filenames-match-regex": ["error", PAGE_ROUTE_FILENAME_PATTERN],
      },
    },
  ],
  rules: {
    // ── github ─────────────────────────────────────────────────────────
    "github/a11y-aria-label-is-well-formatted": "error",
    "github/a11y-no-title-attribute": "error",
    "github/a11y-no-visually-hidden-interactive-element": "error",
    "github/a11y-role-supports-aria-props": "error",
    "github/a11y-svg-has-accessible-name": "error",
    "github/array-foreach": "error",
    "github/async-currenttarget": "error",
    "github/async-preventdefault": "error",
    "github/authenticity-token": "error",
    "github/filenames-match-regex": "error",
    "github/get-attribute": "error",
    "github/js-class-name": "error",
    "github/no-blur": "error",
    "github/no-d-none": "error",
    // Conflicts with unicorn/prefer-dom-node-dataset, which is the benchmark.
    "github/no-dataset": "off",
    "github/no-dynamic-script-tag": "error",
    // The JS plugin bridge misreads module-scoped declarations (e.g. Astro
    // frontmatter) as implicit globals, producing false positives.
    "github/no-implicit-buggy-globals": "off",
    "github/no-inner-html": "error",
    "github/no-innerText": "error",
    // Same name-only match as promise/prefer-await-to-then, which is off for
    // reporting non-promise APIs such as Zod's `.catch()` (#854).
    "github/no-then": "off",
    "github/no-useless-passive": "error",
    "github/prefer-observers": "error",
    "github/require-passive-events": "error",
    // Mirrors the ESLint preset.
    "github/unescaped-html-literal": "off",

    // ── sonarjs ────────────────────────────────────────────────────────
    // Every non-deprecated sonarjs rule that runs without type information,
    // which the JS plugin bridge doesn't provide: the unmarked rules, plus the
    // ones marked `requiresTypeChecking` that also check the syntax tree (the
    // ESLint core preset's worksWithoutTypes list). The rest stay in the
    // ESLint type-aware preset.
    "sonarjs/anchor-precedence": "error",
    "sonarjs/arguments-order": "error",
    "sonarjs/arguments-usage": "error",
    "sonarjs/array-constructor": "error",
    // Fights the formatter (arrowParentheses: always).
    "sonarjs/arrow-function-convention": "off",
    "sonarjs/assertions-in-test-cases": "error",
    "sonarjs/async-test-assertions": "error",
    "sonarjs/avoid-mutating-nested-properties-of-shallow-clones": "error",
    "sonarjs/aws-apigateway-public-api": "error",
    "sonarjs/aws-ec2-rds-dms-public": "error",
    "sonarjs/aws-ec2-unencrypted-ebs-volume": "error",
    "sonarjs/aws-efs-unencrypted": "error",
    "sonarjs/aws-iam-all-privileges": "error",
    "sonarjs/aws-iam-all-resources-accessible": "error",
    "sonarjs/aws-iam-privilege-escalation": "error",
    "sonarjs/aws-iam-public-access": "error",
    "sonarjs/aws-opensearchservice-domain": "error",
    "sonarjs/aws-rds-unencrypted-databases": "error",
    "sonarjs/aws-restricted-ip-admin-access": "error",
    "sonarjs/aws-s3-bucket-granted-access": "error",
    "sonarjs/aws-s3-bucket-insecure-http": "error",
    "sonarjs/aws-s3-bucket-public-access": "error",
    "sonarjs/aws-s3-bucket-versioning": "error",
    "sonarjs/aws-sagemaker-unencrypted-notebook": "error",
    "sonarjs/aws-sns-unencrypted-topics": "error",
    "sonarjs/aws-sqs-unencrypted-queue": "error",
    "sonarjs/bitwise-operators": "error",
    "sonarjs/block-scoped-var": "error",
    "sonarjs/bool-param-default": "error",
    "sonarjs/call-argument-line": "error",
    "sonarjs/chai-determinate-assertion": "error",
    "sonarjs/class-name": "error",
    "sonarjs/class-prototype": "error",
    "sonarjs/code-eval": "error",
    // The same number as Biome's noExcessiveCognitiveComplexity limit, but the
    // two score functions differently, so the limits aren't equivalent.
    "sonarjs/cognitive-complexity": ["error", 20],
    "sonarjs/comma-or-logical-or-case": "error",
    "sonarjs/comment-regex": "error",
    "sonarjs/composite-assertions": "error",
    "sonarjs/concise-regex": "error",
    "sonarjs/constructor-for-side-effects": "error",
    "sonarjs/content-length": "error",
    "sonarjs/content-security-policy": "error",
    "sonarjs/cookie-no-httponly": "error",
    "sonarjs/cors": "error",
    "sonarjs/csrf": "error",
    // Duplicate of the core complexity rule.
    "sonarjs/cyclomatic-complexity": "off",
    "sonarjs/declarations-in-global-scope": "error",
    "sonarjs/destructuring-assignment-syntax": "error",
    "sonarjs/disabled-auto-escaping": "error",
    "sonarjs/disabled-timeout": "error",
    "sonarjs/dompurify-unsafe-config": "error",
    "sonarjs/duplicates-in-character-class": "error",
    "sonarjs/dynamically-constructed-templates": "error",
    // Mirrors the ESLint preset.
    "sonarjs/elseif-without-else": "off",
    "sonarjs/empty-string-repetition": "error",
    "sonarjs/encryption-secure-mode": "error",
    "sonarjs/explicit-test-skip": "error",
    "sonarjs/expression-complexity": "error",
    // Requires a headerFormat option; errors on every file without one.
    "sonarjs/file-header": "off",
    // Fires on any file whose name differs from an exported class, which is
    // noise for config and module files that export objects, not classes.
    "sonarjs/file-name-differ-from-class": "off",
    "sonarjs/file-permissions": "error",
    "sonarjs/file-uploads": "error",
    // Duplicates no-warning-comments in core on every FIXME, with a message
    // that says the opposite ("take the required action" against "remove or
    // rephrase"), so one comment needed two suppressions.
    "sonarjs/fixme-tag": "off",
    "sonarjs/for-in": "error",
    "sonarjs/for-loop-increment-sign": "error",
    "sonarjs/function-inside-loop": "error",
    "sonarjs/function-name": "error",
    "sonarjs/future-reserved-words": "error",
    "sonarjs/generator-without-yield": "error",
    "sonarjs/hardcoded-secret-signatures": "error",
    "sonarjs/hashing": "error",
    "sonarjs/hooks-before-test-cases": "error",
    "sonarjs/inconsistent-function-call": "error",
    "sonarjs/insecure-cookie": "error",
    "sonarjs/insecure-jwt-token": "error",
    "sonarjs/inverted-assertion-arguments": "error",
    "sonarjs/label-position": "error",
    "sonarjs/link-with-target-blank": "error",
    // The preset disables max-lines everywhere.
    "sonarjs/max-lines": "off",
    // The preset disables max-lines-per-function everywhere.
    "sonarjs/max-lines-per-function": "off",
    "sonarjs/max-switch-cases": "error",
    "sonarjs/max-union-size": "error",
    "sonarjs/memoize-cache-key": "error",
    "sonarjs/misplaced-loop-counter": "error",
    // Overlaps max-depth, which is off. Not a duplicate: it defaults to 3
    // levels rather than 4, and carries nesting across nested functions.
    "sonarjs/nested-control-flow": "off",
    "sonarjs/no-all-duplicated-branches": "error",
    "sonarjs/no-angular-bypass-sanitization": "error",
    "sonarjs/no-built-in-override": "error",
    "sonarjs/no-case-label-in-switch": "error",
    "sonarjs/no-clear-text-protocols": "error",
    "sonarjs/no-code-after-done": "error",
    "sonarjs/no-collapsible-if": "error",
    "sonarjs/no-collection-size-mischeck": "error",
    "sonarjs/no-commented-code": "error",
    "sonarjs/no-control-regex": "error",
    "sonarjs/no-dead-store": "error",
    "sonarjs/no-debounce-throttle-in-render": "error",
    "sonarjs/no-debug-commands-in-ui-tests": "error",
    "sonarjs/no-default-utility-imports": "error",
    "sonarjs/no-delete-var": "error",
    "sonarjs/no-duplicate-in-composite": "error",
    "sonarjs/no-duplicate-parameterized-test-case": "error",
    "sonarjs/no-duplicate-string": "error",
    "sonarjs/no-duplicate-test-title": "error",
    "sonarjs/no-duplicated-branches": "error",
    "sonarjs/no-element-overwrite": "error",
    "sonarjs/no-empty-after-reluctant": "error",
    "sonarjs/no-empty-alternatives": "error",
    "sonarjs/no-empty-character-class": "error",
    "sonarjs/no-empty-collection": "error",
    "sonarjs/no-empty-group": "error",
    "sonarjs/no-empty-parameterized-test-dataset": "error",
    "sonarjs/no-empty-test-file": "error",
    "sonarjs/no-empty-test-title": "error",
    "sonarjs/no-equals-in-for-termination": "error",
    "sonarjs/no-exclusive-tests": "error",
    "sonarjs/no-extra-arguments": "error",
    "sonarjs/no-fallthrough": "error",
    "sonarjs/no-fixed-wait-in-tests": "error",
    "sonarjs/no-floating-point-equality": "error",
    "sonarjs/no-forced-browser-interaction": "error",
    "sonarjs/no-function-declaration-in-block": "error",
    "sonarjs/no-global-this": "error",
    "sonarjs/no-globals-shadowing": "error",
    "sonarjs/no-gratuitous-expressions": "error",
    "sonarjs/no-hardcoded-ip": "error",
    "sonarjs/no-hardcoded-passwords": "error",
    "sonarjs/no-hardcoded-secrets": "error",
    "sonarjs/no-hook-setter-in-body": "error",
    "sonarjs/no-identical-conditions": "error",
    "sonarjs/no-identical-expressions": "error",
    "sonarjs/no-identical-functions": "error",
    "sonarjs/no-ignored-exceptions": "error",
    // The JS plugin bridge has no dependency-manifest resolution, so this
    // flags builtin (bun:test) and workspace imports as missing dependencies.
    "sonarjs/no-implicit-dependencies": "off",
    "sonarjs/no-implicit-global": "error",
    "sonarjs/no-incomplete-assertions": "error",
    "sonarjs/no-inconsistent-returns": "error",
    "sonarjs/no-internal-api-use": "error",
    "sonarjs/no-interpolation-in-inline-snapshots": "error",
    "sonarjs/no-invalid-regexp": "error",
    "sonarjs/no-invariant-returns": "error",
    "sonarjs/no-inverted-boolean-check": "error",
    "sonarjs/no-labels": "error",
    "sonarjs/no-literal-call": "error",
    "sonarjs/no-mime-sniff": "error",
    "sonarjs/no-misleading-character-class": "error",
    "sonarjs/no-mixed-completion-style": "error",
    "sonarjs/no-mutate-reactive-state-in-updated-hook": "error",
    "sonarjs/no-nested-assignment": "error",
    "sonarjs/no-nested-conditional": "error",
    // sonarjs 4.2.1 raised the default threshold to 5; keep the stricter 4.
    "sonarjs/no-nested-functions": ["error", { threshold: 4 }],
    "sonarjs/no-nested-incdec": "error",
    "sonarjs/no-nested-switch": "error",
    "sonarjs/no-nested-template-literals": "error",
    "sonarjs/no-networkidle-wait": "error",
    "sonarjs/no-os-command-from-path": "error",
    "sonarjs/no-parameter-reassignment": "error",
    "sonarjs/no-primitive-wrappers": "error",
    "sonarjs/no-redundant-assignments": "error",
    "sonarjs/no-redundant-boolean": "error",
    "sonarjs/no-redundant-jump": "error",
    "sonarjs/no-redundant-optional": "error",
    // The jsPlugins bridge provides no globals, so every identifier is flagged.
    "sonarjs/no-reference-error": "off",
    "sonarjs/no-referrer-policy": "error",
    "sonarjs/no-regex-spaces": "error",
    "sonarjs/no-require-or-define": "error",
    "sonarjs/no-same-argument-assert": "error",
    "sonarjs/no-same-line-conditional": "error",
    "sonarjs/no-session-cookies-on-static-assets": "error",
    "sonarjs/no-skipped-tests": "error",
    "sonarjs/no-small-switch": "error",
    "sonarjs/no-sonar-comments": "error",
    "sonarjs/no-table-as-layout": "error",
    "sonarjs/no-trivial-assertions": "error",
    "sonarjs/no-undefined-assignment": "error",
    "sonarjs/no-unenclosed-multiline-block": "error",
    "sonarjs/no-uniq-key": "error",
    "sonarjs/no-unthrown-error": "error",
    "sonarjs/no-unused-collection": "error",
    "sonarjs/no-unused-function-argument": "error",
    // Duplicates no-unused-vars in core and has no options, so it reports the
    // underscore-prefixed names core's convention allows.
    "sonarjs/no-unused-vars": "off",
    "sonarjs/no-use-of-empty-return-value": "error",
    "sonarjs/no-useless-catch": "error",
    "sonarjs/no-useless-increment": "error",
    "sonarjs/no-useless-react-setstate": "error",
    "sonarjs/no-variable-usage-before-declaration": "error",
    "sonarjs/no-vue-class-component": "error",
    "sonarjs/no-vue-mixins": "error",
    "sonarjs/no-weak-cipher": "error",
    "sonarjs/no-weak-keys": "error",
    // Libraries such as Zod and Radix document `import * as` as their API,
    // and bundlers tree-shake member access on a namespace. Matches
    // import/no-namespace being off in core.
    "sonarjs/no-wildcard-import": "off",
    "sonarjs/non-existent-operator": "error",
    "sonarjs/object-alt-content": "error",
    "sonarjs/parameterized-tests": "error",
    "sonarjs/prefer-cypress-should": "error",
    "sonarjs/prefer-default-last": "error",
    "sonarjs/prefer-immediate-return": "error",
    "sonarjs/prefer-native-axios-alternative": "error",
    "sonarjs/prefer-native-jquery-alternative": "error",
    "sonarjs/prefer-native-lodash-alternative": "error",
    "sonarjs/prefer-object-literal": "error",
    "sonarjs/prefer-promise-shorthand": "error",
    "sonarjs/prefer-single-boolean-return": "error",
    "sonarjs/prefer-specific-assertions": "error",
    "sonarjs/prefer-type-guard": "error",
    "sonarjs/prefer-while": "error",
    "sonarjs/production-debug": "error",
    "sonarjs/pseudo-random": "error",
    "sonarjs/public-static-readonly": "error",
    "sonarjs/publicly-writable-directories": "error",
    "sonarjs/reduce-initial-value": "error",
    "sonarjs/redundant-type-aliases": "error",
    "sonarjs/regex-complexity": "error",
    "sonarjs/review-blockchain-mnemonic": "error",
    "sonarjs/session-regeneration": "error",
    "sonarjs/shorthand-property-grouping": "error",
    "sonarjs/single-char-in-character-classes": "error",
    "sonarjs/single-character-alternation": "error",
    "sonarjs/slow-regex": "error",
    "sonarjs/sql-queries": "error",
    "sonarjs/stable-tests": "error",
    "sonarjs/stateful-regex": "error",
    "sonarjs/strict-transport-security": "error",
    "sonarjs/super-linear-regex": "error",
    "sonarjs/synchronous-suite-callback": "error",
    "sonarjs/table-header": "error",
    "sonarjs/table-header-reference": "error",
    "sonarjs/test-check-exception": "error",
    "sonarjs/testing-library-prefer-query-by-disappearance": "error",
    "sonarjs/testing-library-query-assertion": "error",
    // Duplicates no-warning-comments in core; see sonarjs/fixme-tag.
    "sonarjs/todo-tag": "off",
    "sonarjs/too-many-break-or-continue-in-loop": "error",
    "sonarjs/unicode-aware-regex": "error",
    "sonarjs/unused-import": "error",
    "sonarjs/unverified-certificate": "error",
    "sonarjs/unverified-hostname": "error",
    "sonarjs/updated-const-var": "error",
    "sonarjs/updated-loop-counter": "error",
    "sonarjs/use-type-alias": "error",
    "sonarjs/variable-name": "error",
    "sonarjs/vitest-mock-at-module-scope": "error",
    "sonarjs/void-use": "error",
    "sonarjs/weak-ssl": "error",
    "sonarjs/x-powered-by": "error",
    "sonarjs/xml-parser-xxe": "error",

    // ── react-doctor ────────────────────────────────────────────────────
    // The same rules as the ESLint react preset (config/eslint/react/rules/
    // react-doctor.mjs), which says how the list is chosen. Rules for one
    // library (React Router, three.js, Ink, Motion and others) stay silent in a
    // project that doesn't use it. no-spread-accumulator-in-reduce is left to
    // the native oxc/no-accumulating-spread in core.
    "react-doctor/activity-wraps-effect-heavy-subtree": "error",
    "react-doctor/advanced-event-handler-refs": "error",
    "react-doctor/async-await-in-loop": "error",
    "react-doctor/async-defer-await": "error",
    "react-doctor/async-parallel": "error",
    "react-doctor/auth-token-in-web-storage": "error",
    "react-doctor/class-component-missing-component-will-unmount-teardown":
      "error",
    "react-doctor/client-localstorage-no-version": "error",
    "react-doctor/client-passive-event-listeners": "error",
    "react-doctor/context-provider-value-from-unmemoized-local-literal":
      "error",
    "react-doctor/debounce-no-cleanup": "error",
    "react-doctor/dialog-has-accessible-name": "error",
    "react-doctor/effect-listener-cleanup-mismatch": "error",
    "react-doctor/effect-listener-cleanup-reference-mismatch": "error",
    "react-doctor/effect-needs-cleanup": "error",
    "react-doctor/effect-observer-needs-disconnect": "error",
    "react-doctor/effect-raf-loop-needs-cancel": "error",
    "react-doctor/effect-remove-listener-inline-handler": "error",
    "react-doctor/forwarded-set-state-in-effect": "error",
    "react-doctor/hook-import-rename-loses-use-prefix": "error",
    "react-doctor/hooks-no-nan-in-deps": "error",
    "react-doctor/html-label-has-single-control": "error",
    "react-doctor/html-no-invalid-paragraph-child": "error",
    "react-doctor/html-no-invalid-table-nesting": "error",
    "react-doctor/html-no-nested-form": "error",
    "react-doctor/html-no-nested-interactive": "error",
    "react-doctor/ink-ctrl-c-handler-requires-exit-option": "error",
    "react-doctor/ink-no-bare-process-exit": "error",
    "react-doctor/ink-no-direct-raw-mode": "error",
    "react-doctor/ink-no-dom-host-elements": "error",
    "react-doctor/ink-no-dom-router": "error",
    "react-doctor/ink-no-focus-in-render": "error",
    "react-doctor/ink-no-layout-inside-text": "error",
    "react-doctor/ink-no-live-hooks-in-render-to-string": "error",
    "react-doctor/ink-no-measure-element-in-render": "error",
    "react-doctor/ink-no-multiple-static": "error",
    "react-doctor/ink-no-raw-text": "error",
    "react-doctor/ink-no-repeated-render": "error",
    "react-doctor/ink-prefer-use-animation": "error",
    "react-doctor/ink-static-is-append-only": "error",
    "react-doctor/ink-static-requires-key": "error",
    "react-doctor/ink-use-reactive-window-size": "error",
    "react-doctor/ink-use-string-width-for-cursor": "error",
    "react-doctor/ink-use-suspend-terminal": "error",
    "react-doctor/ink-valid-aria-semantics": "error",
    "react-doctor/jotai-derived-atom-returns-fresh-object": "error",
    "react-doctor/jotai-select-atom-in-render-body": "error",
    "react-doctor/jotai-tq-use-raw-query-atom": "error",
    "react-doctor/js-async-reduce-without-awaited-acc": "error",
    "react-doctor/js-batch-dom-css": "error",
    "react-doctor/js-cache-property-access": "error",
    "react-doctor/js-cache-storage": "error",
    "react-doctor/js-combine-iterations": "error",
    "react-doctor/js-early-exit": "error",
    "react-doctor/js-flatmap-filter": "error",
    "react-doctor/js-hoist-intl": "error",
    "react-doctor/js-hoist-regexp": "error",
    "react-doctor/js-index-maps": "error",
    "react-doctor/js-length-check-first": "error",
    "react-doctor/js-min-max-loop": "error",
    "react-doctor/js-set-map-lookups": "error",
    "react-doctor/js-tosorted-immutable": "error",
    "react-doctor/jsx-numeric-and-leaked-render": "error",
    "react-doctor/mobx-no-make-auto-observable-in-inheritance": "error",
    "react-doctor/mobx-no-observer-wrapped-memo": "error",
    "react-doctor/mobx-reaction-disposer-discarded": "error",
    "react-doctor/motion-animate-presence-must-outlive-child": "error",
    "react-doctor/motion-animate-presence-requires-key": "error",
    "react-doctor/motion-animate-presence-wait-single-child": "error",
    "react-doctor/motion-create-in-render": "error",
    "react-doctor/motion-drag-axis-constraint-mismatch": "error",
    "react-doctor/motion-imperative-animation-in-render": "error",
    "react-doctor/motion-keyframe-times-mismatch": "error",
    "react-doctor/motion-layout-on-inline-element": "error",
    "react-doctor/motion-unstable-layout-id-in-iteration": "error",
    "react-doctor/motion-use-transform-range-length": "error",
    "react-doctor/motion-value-constructor-in-render": "error",
    "react-doctor/motion-value-subscription-in-render": "error",
    "react-doctor/no-adjust-state-on-prop-change": "error",
    "react-doctor/no-arithmetic-on-optional-chained-operand": "error",
    "react-doctor/no-array-find-result-member-access-without-guard": "error",
    "react-doctor/no-array-index-as-key": "error",
    "react-doctor/no-array-index-deref-without-bounds-or-empty-guard": "error",
    "react-doctor/no-assertive-status": "error",
    "react-doctor/no-async-effect-callback": "error",
    "react-doctor/no-async-event-handler-without-reentry-guard": "error",
    "react-doctor/no-autoplay-without-muted": "error",
    // React Doctor made this opt-in upstream, as unmeasured performance
    // advice, and the barrel rule that stays on is core's oxc/no-barrel-file.
    "react-doctor/no-barrel-import": "off",
    "react-doctor/no-blocked-paste": "error",
    "react-doctor/no-boolean-toggle-without-functional-update": "error",
    "react-doctor/no-broken-image-source": "error",
    "react-doctor/no-call-component-as-function": "error",
    "react-doctor/no-cascading-set-state": "error",
    "react-doctor/no-chain-state-updates": "error",
    "react-doctor/no-collapsed-literal-or-chain-as-value": "error",
    "react-doctor/no-conflicting-spring-options": "error",
    "react-doctor/no-controlled-input-value-without-state-update": "error",
    "react-doctor/no-create-context-in-render": "error",
    "react-doctor/no-create-object-url-in-render": "error",
    "react-doctor/no-create-object-url-without-revoke": "error",
    "react-doctor/no-create-ref-in-function-component": "error",
    "react-doctor/no-create-store-in-render": "error",
    "react-doctor/no-default-props": "error",
    "react-doctor/no-deprecated-keyboard-event-keycode-which": "error",
    "react-doctor/no-derived-state": "error",
    "react-doctor/no-derived-state-effect": "error",
    "react-doctor/no-derived-useState": "error",
    "react-doctor/no-direct-state-mutation": "error",
    "react-doctor/no-disabled-zoom": "error",
    "react-doctor/no-document-start-view-transition": "error",
    "react-doctor/no-document-write": "error",
    "react-doctor/no-dynamic-import-path": "error",
    "react-doctor/no-eager-new-in-use-state-initializer": "error",
    "react-doctor/no-effect-chain": "error",
    "react-doctor/no-effect-event-handler": "error",
    "react-doctor/no-effect-event-in-deps": "error",
    "react-doctor/no-effect-with-fresh-deps": "error",
    "react-doctor/no-effect-wrapper-discards-callback-cleanup-return": "error",
    "react-doctor/no-enter-submit-without-ime-composition-guard": "error",
    "react-doctor/no-eval": "error",
    "react-doctor/no-event-handler": "error",
    "react-doctor/no-event-trigger-state": "error",
    "react-doctor/no-fetch-in-effect": "error",
    "react-doctor/no-fetch-response-used-without-status-check": "error",
    "react-doctor/no-fill-map-element-as-key": "error",
    "react-doctor/no-floating-then-in-jsx-handler": "error",
    "react-doctor/no-flush-sync": "error",
    "react-doctor/no-focusable-content-in-aria-hidden": "error",
    "react-doctor/no-full-lodash-import": "error",
    "react-doctor/no-giant-component": "error",
    "react-doctor/no-global-css-variable-animation": "error",
    "react-doctor/no-gray-on-colored-background": "error",
    "react-doctor/no-hydration-branch-on-browser-global": "error",
    "react-doctor/no-img-lazy-with-high-fetchpriority": "error",
    "react-doctor/no-impure-call-at-module-scope": "error",
    "react-doctor/no-impure-state-updater": "error",
    "react-doctor/no-indeterminate-attribute": "error",
    "react-doctor/no-initialize-state": "error",
    "react-doctor/no-inline-bounce-easing": "error",
    "react-doctor/no-inline-exhaustive-style": "error",
    "react-doctor/no-inline-hoc-on-component": "error",
    "react-doctor/no-inline-prop-on-memo-component": "error",
    "react-doctor/no-invalid-progress-range": "error",
    "react-doctor/no-json-parse-stringify-clone": "error",
    "react-doctor/no-jsx-element-type": "error",
    "react-doctor/no-large-animated-blur": "error",
    "react-doctor/no-layout-property-animation": "error",
    "react-doctor/no-layout-transition-inline": "error",
    "react-doctor/no-legacy-class-lifecycles": "error",
    "react-doctor/no-legacy-context-api": "error",
    "react-doctor/no-loading-flag-reset-outside-finally": "error",
    "react-doctor/no-locale-format-in-render": "error",
    "react-doctor/no-long-transition-duration": "error",
    "react-doctor/no-many-boolean-props": "error",
    "react-doctor/no-match-media-in-state-initializer": "error",
    "react-doctor/no-mirror-prop-effect": "error",
    "react-doctor/no-mixed-srcset-descriptors": "error",
    "react-doctor/no-moment": "error",
    "react-doctor/no-multiple-main-landmarks": "error",
    "react-doctor/no-multiple-unlabeled-navigation-landmarks": "error",
    "react-doctor/no-mutable-in-deps": "error",
    "react-doctor/no-mutate-queried-dom-node-in-component": "error",
    "react-doctor/no-mutate-then-set-or-return-same-reference": "error",
    "react-doctor/no-mutating-array-method-on-prop-or-hook-result": "error",
    "react-doctor/no-mutating-reducer-state": "error",
    "react-doctor/no-nested-component-definition": "error",
    "react-doctor/no-non-literal-selector-query-without-try-catch": "error",
    "react-doctor/no-non-null-assertion-on-maybe-undefined-result": "error",
    "react-doctor/no-nondeterministic-id-value-in-render-body": "error",
    "react-doctor/no-nullish-coalescing-arithmetic-precedence": "error",
    "react-doctor/no-object-keys-values-entries-on-maybe-undefined": "error",
    "react-doctor/no-object-or-array-coerced-to-string-in-template-literal":
      "error",
    "react-doctor/no-outline-none": "error",
    "react-doctor/no-pass-data-to-parent": "error",
    "react-doctor/no-pass-live-state-to-parent": "error",
    "react-doctor/no-path-prefix-containment": "error",
    "react-doctor/no-permanent-will-change": "error",
    "react-doctor/no-placeholder-only-field": "error",
    "react-doctor/no-polymorphic-children": "error",
    "react-doctor/no-predicate-function-reference-in-boolean-position": "error",
    "react-doctor/no-prevent-default": "error",
    "react-doctor/no-promise-then-side-effect-in-effect-without-catch": "error",
    "react-doctor/no-prop-callback-in-effect": "error",
    "react-doctor/no-prop-callback-in-render": "error",
    "react-doctor/no-random-key": "error",
    "react-doctor/no-react-dom-deprecated-apis": "error",
    "react-doctor/no-react19-deprecated-apis": "error",
    "react-doctor/no-ref-current-in-render": "error",
    "react-doctor/no-render-in-render": "error",
    "react-doctor/no-render-prop-children": "error",
    "react-doctor/no-reset-all-state-on-prop-change": "error",
    "react-doctor/no-responsive-hidden-accessible-name": "error",
    "react-doctor/no-scale-from-zero": "error",
    "react-doctor/no-secrets-in-client-code": "error",
    "react-doctor/no-self-updating-effect": "error",
    "react-doctor/no-set-state-after-await-in-effect": "error",
    "react-doctor/no-set-state-in-render": "error",
    "react-doctor/no-side-effect-in-state-updater-function": "error",
    "react-doctor/no-spread-props-over-defaults-clobbers-with-undefined":
      "error",
    "react-doctor/no-srcset-without-sizes": "error",
    "react-doctor/no-stale-timer-ref": "error",
    "react-doctor/no-static-motion-config-never": "error",
    "react-doctor/no-string-false-on-boolean-attribute": "error",
    "react-doctor/no-sync-xhr": "error",
    "react-doctor/no-tiny-text": "error",
    "react-doctor/no-transition-all": "error",
    "react-doctor/no-uncontrolled-input": "error",
    "react-doctor/no-undeferred-third-party": "error",
    "react-doctor/no-unescaped-dynamic-string-in-regexp": "error",
    "react-doctor/no-unguarded-browser-global-at-module-scope": "error",
    "react-doctor/no-unguarded-browser-global-in-render-or-hook-init": "error",
    "react-doctor/no-unguarded-numeric-input-parse": "error",
    "react-doctor/no-unguarded-throwing-parse-call": "error",
    "react-doctor/no-uninformative-aria-label": "error",
    "react-doctor/no-unsafe-json-parse": "error",
    "react-doctor/no-unthrottled-scroll-mutation": "error",
    "react-doctor/no-usememo-simple-expression": "error",
    "react-doctor/no-whole-object-default-losing-per-key-defaults": "error",
    "react-doctor/no-whole-object-dep-with-member-reads": "error",
    "react-doctor/only-export-components": "error",
    "react-doctor/pointer-capture-needs-cancel-handler": "error",
    "react-doctor/prefer-dynamic-import": "error",
    "react-doctor/prefer-explicit-variants": "error",
    "react-doctor/prefer-html-dialog": "error",
    "react-doctor/prefer-module-scope-pure-function": "error",
    "react-doctor/prefer-module-scope-static-value": "error",
    "react-doctor/prefer-stable-empty-fallback": "error",
    "react-doctor/prefer-use-effect-event": "error",
    "react-doctor/prefer-use-sync-external-store": "error",
    "react-doctor/prefer-useReducer": "error",
    "react-doctor/r3f-cap-device-pixel-ratio": "error",
    "react-doctor/r3f-limit-shadowed-point-lights": "error",
    "react-doctor/r3f-no-advancing-clock-in-use-frame": "error",
    "react-doctor/r3f-no-allocation-in-pointer-move": "error",
    "react-doctor/r3f-no-async-use-frame": "error",
    "react-doctor/r3f-no-clone-in-use-frame": "error",
    "react-doctor/r3f-no-deep-use-three-selector": "error",
    "react-doctor/r3f-no-dispose-loader-cache": "error",
    "react-doctor/r3f-no-duplicate-primitive-object": "error",
    "react-doctor/r3f-no-extend-in-render": "error",
    "react-doctor/r3f-no-extend-three-namespace": "error",
    "react-doctor/r3f-no-fresh-portal-container": "error",
    "react-doctor/r3f-no-fresh-use-three-selector": "error",
    "react-doctor/r3f-no-imperative-attach-of-managed-ref": "error",
    "react-doctor/r3f-no-inline-primitive-object": "error",
    "react-doctor/r3f-no-inline-resource-prop": "error",
    "react-doctor/r3f-no-internal-imports": "error",
    "react-doctor/r3f-no-manual-canvas-resize": "error",
    "react-doctor/r3f-no-mutate-loader-cache": "error",
    "react-doctor/r3f-no-mutating-pointer-event-data": "error",
    "react-doctor/r3f-no-new-in-use-frame": "error",
    "react-doctor/r3f-no-null-loader-input": "error",
    "react-doctor/r3f-no-object-pointer-capture": "error",
    "react-doctor/r3f-no-recursive-raf-with-use-frame": "error",
    "react-doctor/r3f-no-state-in-pointer-move": "error",
    "react-doctor/r3f-no-state-in-use-frame": "error",
    "react-doctor/r3f-no-sync-readback-in-use-frame": "error",
    "react-doctor/r3f-no-unstable-args": "error",
    "react-doctor/r3f-no-use-frame-dependency-array": "error",
    "react-doctor/r3f-prefer-use-loader": "error",
    "react-doctor/r3f-require-frame-delta": "error",
    "react-doctor/r3f-require-global-effect-cleanup": "error",
    "react-doctor/r3f-require-instanced-buffer-update": "error",
    "react-doctor/r3f-require-owned-texture-cleanup": "error",
    "react-doctor/r3f-require-projection-matrix-update": "error",
    "react-doctor/r3f-require-render-with-positive-priority": "error",
    "react-doctor/r3f-require-root-unmount": "error",
    "react-doctor/r3f-webgpu-canvas-prop-compatibility": "error",
    "react-doctor/r3f-webgpu-no-gl-state": "error",
    "react-doctor/r3f-webgpu-no-js-uniform-branch": "error",
    "react-doctor/r3f-webgpu-no-legacy-effect-composer": "error",
    "react-doctor/r3f-webgpu-no-legacy-material-api": "error",
    "react-doctor/r3f-webgpu-no-unregistered-pipeline-pass": "error",
    "react-doctor/radio-input-missing-name": "error",
    "react-doctor/react-compiler-no-manual-memoization": "error",
    "react-doctor/react-markdown-unsanitized-raw-html": "error",
    "react-doctor/react-router-csp-nonce-consistency": "error",
    "react-doctor/react-router-descendant-routes-require-splat": "error",
    "react-doctor/react-router-guard-aborted-handle-error": "error",
    "react-doctor/react-router-internal-route-anchor": "error",
    "react-doctor/react-router-loader-fetch-forwards-signal": "error",
    "react-doctor/react-router-loader-parallel-fetch": "error",
    "react-doctor/react-router-nested-route-requires-outlet": "error",
    "react-doctor/react-router-no-catch-middleware-next": "error",
    "react-doctor/react-router-no-client-module-in-server-render": "error",
    "react-doctor/react-router-no-duplicate-route-id": "error",
    "react-doctor/react-router-no-empty-leaf-route": "error",
    "react-doctor/react-router-no-invalid-absolute-child-path": "error",
    "react-doctor/react-router-no-invalid-lazy-route-properties": "error",
    "react-doctor/react-router-no-invalid-splat-path": "error",
    "react-doctor/react-router-no-loader-request-body": "error",
    "react-doctor/react-router-no-middleware-response-body-consumption":
      "error",
    "react-doctor/react-router-no-multiple-blockers": "error",
    "react-doctor/react-router-no-multiple-middleware-next": "error",
    "react-doctor/react-router-no-multiple-set-search-params-in-tick": "error",
    "react-doctor/react-router-no-navigate-in-render": "error",
    "react-doctor/react-router-no-nested-router": "error",
    "react-doctor/react-router-no-redirect-in-try-catch": "error",
    "react-doctor/react-router-no-route-module-environment-suffix": "error",
    "react-doctor/react-router-no-router-in-render": "error",
    "react-doctor/react-router-no-session-mutation-in-loader": "error",
    "react-doctor/react-router-no-static-cookie-expires": "error",
    "react-doctor/react-router-no-unsynchronized-search-params-mutation":
      "error",
    "react-doctor/react-router-no-use-loader-data-in-error-ui": "error",
    "react-doctor/react-router-prefer-route-lazy": "error",
    "react-doctor/react-router-require-root-error-boundary": "error",
    "react-doctor/react-router-resource-link-requires-reload": "error",
    "react-doctor/react-router-return-navigation-promise-in-transition":
      "error",
    "react-doctor/react-router-server-middleware-return-response": "error",
    "react-doctor/react-router-session-mutation-requires-commit": "error",
    "react-doctor/react-router-v8-no-meta-data-field": "error",
    "react-doctor/react-router-v8-no-react-router-dom-import": "error",
    "react-doctor/react-router-v8-no-removed-future-flags": "error",
    "react-doctor/react-router-valid-route-object": "error",
    "react-doctor/redux-useselector-inline-derivation": "error",
    "react-doctor/redux-useselector-returns-new-collection": "error",
    "react-doctor/remotion-calculate-metadata-fetch-signal": "error",
    "react-doctor/remotion-deterministic-randomness": "error",
    "react-doctor/remotion-no-css-animation": "error",
    "react-doctor/remotion-no-css-transition": "error",
    "react-doctor/remotion-no-css-url-assets": "error",
    "react-doctor/remotion-no-module-scope-delay-render": "error",
    "react-doctor/remotion-no-native-media-elements": "error",
    "react-doctor/remotion-no-next-image": "error",
    "react-doctor/remotion-stable-delay-render-handle": "error",
    "react-doctor/rendering-animate-svg-wrapper": "error",
    "react-doctor/rendering-conditional-render": "error",
    "react-doctor/rendering-hoist-jsx": "error",
    "react-doctor/rendering-hydration-mismatch-time": "error",
    "react-doctor/rendering-hydration-no-flicker": "error",
    "react-doctor/rendering-script-defer-async": "error",
    "react-doctor/rendering-svg-precision": "error",
    "react-doctor/rendering-usetransition-loading": "error",
    "react-doctor/rerender-defer-reads-hook": "error",
    "react-doctor/rerender-dependencies": "error",
    "react-doctor/rerender-derived-state-from-hook": "error",
    "react-doctor/rerender-functional-setstate": "error",
    "react-doctor/rerender-lazy-ref-init": "error",
    "react-doctor/rerender-lazy-state-init": "error",
    "react-doctor/rerender-memo-before-early-return": "error",
    "react-doctor/rerender-memo-with-default-value": "error",
    "react-doctor/rerender-state-only-in-handlers": "error",
    "react-doctor/rerender-transitions-scroll": "error",
    "react-doctor/role-button-requires-complete-keyboard-activation": "error",
    "react-doctor/server-after-nonblocking": "error",
    "react-doctor/server-auth-actions": "error",
    "react-doctor/server-cache-with-object-literal": "error",
    "react-doctor/server-dedup-props": "error",
    "react-doctor/server-fetch-without-revalidate": "error",
    "react-doctor/server-hoist-static-io": "error",
    "react-doctor/server-no-mutable-module-state": "error",
    "react-doctor/server-sequential-independent-await": "error",
    "react-doctor/styled-components-non-transient-custom-prop-on-intrinsic-element":
      "error",
    "react-doctor/three-cap-device-pixel-ratio": "error",
    "react-doctor/three-limit-shadowed-point-lights": "error",
    "react-doctor/three-no-allocation-in-pointer-move": "error",
    "react-doctor/three-no-async-animation-loop": "error",
    "react-doctor/three-no-clone-in-animation-loop": "error",
    "react-doctor/three-no-material-recompile-in-animation-loop": "error",
    "react-doctor/three-no-new-in-animation-loop": "error",
    "react-doctor/three-no-object-construction-in-render": "error",
    "react-doctor/three-no-redundant-uniforms-need-update": "error",
    "react-doctor/three-no-state-in-animation-loop": "error",
    "react-doctor/three-no-state-in-pointer-move": "error",
    "react-doctor/three-on-before-compile-require-program-cache-key": "error",
    "react-doctor/three-raw-shader-require-fragment-float-precision": "error",
    "react-doctor/three-raw-shader-require-glsl3-version": "error",
    "react-doctor/three-require-animation-mixer-cleanup": "error",
    "react-doctor/three-require-controls-cleanup": "error",
    "react-doctor/three-require-frame-delta": "error",
    "react-doctor/three-require-instanced-buffer-update": "error",
    "react-doctor/three-require-owned-geometry-cleanup": "error",
    "react-doctor/three-require-owned-material-cleanup": "error",
    "react-doctor/three-require-owned-texture-cleanup": "error",
    "react-doctor/three-require-postprocessing-cleanup": "error",
    "react-doctor/three-require-projection-matrix-update": "error",
    "react-doctor/three-require-render-target-cleanup": "error",
    "react-doctor/three-require-renderer-cleanup": "error",
    "react-doctor/three-shader-no-constant-out-of-bounds-index": "error",
    "react-doctor/three-shader-no-derivatives-in-nonuniform-flow": "error",
    "react-doctor/three-shader-no-invalid-clamp-bounds": "error",
    "react-doctor/three-shader-no-invalid-constant-bit-operations": "error",
    "react-doctor/three-shader-no-invalid-constant-math": "error",
    "react-doctor/three-shader-no-invalid-smoothstep-edges": "error",
    "react-doctor/three-shader-no-inverse-of-uniform": "error",
    "react-doctor/three-shader-no-redeclared-builtins": "error",
    "react-doctor/three-shader-no-redundant-frag-depth": "error",
    "react-doctor/three-shader-no-version-directive": "error",
    "react-doctor/three-shader-prefer-small-integer-pow": "error",
    "react-doctor/three-shader-prefer-squared-distance-comparison": "error",
    "react-doctor/three-shader-require-matching-uniforms": "error",
    "react-doctor/three-shader-require-matching-varyings": "error",
    "react-doctor/three-shader-require-position-on-all-paths": "error",
    "react-doctor/three-shader-require-uniform-bindings": "error",
    "react-doctor/three-tsl-no-js-uniform-branch": "error",
    "react-doctor/three-webgpu-no-legacy-effect-composer": "error",
    "react-doctor/three-webgpu-no-legacy-material-api": "error",
    "react-doctor/use-lazy-motion": "error",
    "react-doctor/valtio-no-proxy-read-in-render": "error",
    "react-doctor/valtio-no-snapshot-in-callback": "error",
    "react-doctor/waapi-animation-in-render": "error",
    "react-doctor/web-animation-offsets-valid": "error",
    "react-doctor/webgl-no-sync-readback-in-animation-loop": "error",
    "react-doctor/window-open-without-noopener": "error",
    "react-doctor/zod-v4-no-deprecated-error-apis": "error",
    "react-doctor/zod-v4-no-deprecated-error-customization": "error",
    "react-doctor/zod-v4-no-deprecated-schema-apis": "error",
    "react-doctor/zod-v4-prefer-top-level-string-formats": "error",
    "react-doctor/zustand-no-fresh-selector-result": "error",
    "react-doctor/zustand-no-get-during-initialization": "error",
    "react-doctor/zustand-no-mutating-state": "error",
    "react-doctor/zustand-no-whole-store-destructure": "error",
  },
});

export default config;

// Returns a copy of this preset narrowed to the given plugin names ("github",
// "jsdoc-js", "sonarjs", "tsdoc", "react-doctor"): only the selected
// jsPlugins entries are loaded and only their rules (top-level and
// per-override) are kept. The documentation plugins are included only when
// explicitly selected, so existing full-preset consumers gain no new
// dependencies on upgrade; selecting either adds a TypeScript override that
// also adjusts core's native jsdoc/* rules (see buildDocumentationOverride).
// `ultracite init` wires this into generated configs when a subset of the
// plugins is chosen, so the generated file stays a one-line extend instead
// of inlining the filtering logic:
//
//   import { selectJsPlugins } from "ultracite/oxlint/js-plugins";
//
//   const jsPlugins = selectJsPlugins(["github", "sonarjs"]);
//
//   export default defineConfig({
//     extends: [core, jsPlugins],
//     ignorePatterns: core.ignorePatterns,
//     jsPlugins: jsPlugins.jsPlugins,
//   });
export const selectJsPlugins = (pluginNames) => {
  const names = new Set(pluginNames);
  const isSelectedRule = ([ruleName]) => names.has(ruleName.split("/")[0]);

  const documentationOverrides =
    names.has("jsdoc-js") || names.has("tsdoc")
      ? [buildDocumentationOverride(names)]
      : [];

  return defineConfig({
    ...config,
    jsPlugins: [...jsPluginEntries, ...documentationPluginEntries].filter(
      (plugin) => names.has(plugin.name)
    ),
    overrides: [
      ...(config.overrides ?? []).map((override) => ({
        ...override,
        rules: Object.fromEntries(
          Object.entries(override.rules ?? {}).filter(isSelectedRule)
        ),
      })),
      ...documentationOverrides,
    ],
    rules: Object.fromEntries(
      Object.entries(config.rules ?? {}).filter(isSelectedRule)
    ),
  });
};
