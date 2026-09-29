import { createRequire } from "node:module";
import path from "node:path";

import { ignorePatterns } from "../shared/ignores.mjs";

// Stylelint imports a bare `customSyntax` name from its own install location,
// which cannot see the project's packages under isolated installs (pnpm, bun).
// Resolve the syntax from the project first, then from this package, and
// hand Stylelint an absolute path. The bare name is the last resort so the
// error message still names the missing package.
const resolveSyntax = (name) => {
  for (const base of [
    path.join(process.cwd(), "package.json"),
    import.meta.url,
  ]) {
    try {
      return createRequire(base).resolve(name);
    } catch {
      // Not resolvable from this base; try the next one.
    }
  }
  return name;
};

// Tailwind CSS at-rules. v3: tailwind, apply, layer, variants, responsive,
// screen, config. v4 (https://tailwindcss.com/docs/functions-and-directives):
// theme, source, utility, variant, custom-variant, slot, plugin, reference.
const tailwindAtRules = [
  "apply",
  "config",
  "custom-variant",
  "layer",
  "plugin",
  "reference",
  "responsive",
  "screen",
  "slot",
  "source",
  "tailwind",
  "theme",
  "utility",
  "variant",
  "variants",
];

// Tailwind v4 functions: theme() plus the dashed functions available inside
// @theme, @utility and regular declarations.
const tailwindFunctions = [
  "--alpha",
  "--modifier",
  "--spacing",
  "--value",
  "theme",
];

// Matches a value that calls one of the Tailwind functions.
const tailwindFunctionPattern = `/(^|[^\\w-])(${tailwindFunctions.join("|")})\\(/`;

/** @type {import('stylelint').Config} */
const config = {
  extends: ["stylelint-config-standard", "stylelint-config-idiomatic-order"],
  // ignoreFiles globs are resolved against the directory of the config file
  // that stylelint loads, which is the project root for the generated
  // `export { default } from "ultracite/stylelint"` config. Directory
  // patterns need a trailing `/**` to match the files inside them.
  ignoreFiles: ignorePatterns.flatMap((pattern) => [pattern, `${pattern}/**`]),
  overrides: [
    {
      customSyntax: resolveSyntax("postcss-scss"),
      files: ["**/*.scss"],
      rules: {
        // Prettier keeps `@else` on the closing-brace line of its `@if`.
        "at-rule-empty-line-before": [
          "always",
          {
            except: ["blockless-after-same-name-blockless", "first-nested"],
            ignore: ["after-comment"],
            ignoreAtRules: ["else"],
          },
        ],
        // Sass modules, mixins, functions and control flow are not CSS
        // at-rules.
        "at-rule-no-unknown": [
          true,
          {
            ignoreAtRules: [
              ...tailwindAtRules,
              "content",
              "debug",
              "each",
              "else",
              "error",
              "extend",
              "for",
              "forward",
              "function",
              "if",
              "include",
              "mixin",
              "return",
              "use",
              "warn",
              "while",
            ],
          },
        ],
        // Sass at-rule preludes ($arguments, `as` namespaces, `in` loops) are
        // not CSS preludes.
        "at-rule-prelude-no-invalid": null,
        // Sass values are unresolved at lint time ($variables, math.div(),
        // interpolation), so CSS value validation reports valid Sass.
        "declaration-property-value-no-unknown": null,
        // Sass built-ins and user @functions (darken(), math.div()).
        "function-no-unknown": null,
        // `//` line comments are valid Sass.
        "no-invalid-double-slash-comments": null,
      },
    },
    {
      customSyntax: resolveSyntax("postcss-less"),
      files: ["**/*.less"],
      rules: {
        // Less variables (`@primary: …;`) and variable media queries parse as
        // at-rules.
        "at-rule-no-unknown": null,
        "at-rule-prelude-no-invalid": null,
        // Less values are unresolved at lint time (@variables, ~"escapes",
        // mixin guards).
        "declaration-property-value-no-unknown": null,
        // Less built-ins (darken(), fade()).
        "function-no-unknown": null,
        "media-query-no-invalid": null,
        // `//` line comments are valid Less.
        "no-invalid-double-slash-comments": null,
      },
    },
  ],
  plugins: ["stylelint-prettier"],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: tailwindAtRules,
      },
    ],
    // `@apply` takes utility class names and the other Tailwind at-rules take
    // Tailwind-specific preludes, none of which parse as CSS.
    "at-rule-prelude-no-invalid": [
      true,
      {
        ignoreAtRules: tailwindAtRules,
      },
    ],
    // Kebab-case like stylelint-config-standard, plus the Tailwind v4 theme
    // variable forms: namespace resets (`--color-*: initial`, `--*: initial`)
    // and sub-properties (`--text-xl--line-height`).
    "custom-property-pattern": [
      "^(\\*|[a-z][a-z0-9]*(-{1,2}[a-z0-9]+)*(-\\*)?)$",
      {
        message: (name) =>
          `Expected custom property name "${name}" to be kebab-case`,
      },
    ],
    "declaration-block-no-redundant-longhand-properties": [
      true,
      {
        ignoreShorthands: ["/flex/"],
      },
    ],
    // Tailwind v4 functions (`--spacing(4)`, `theme(--color-*)`) are not in
    // the CSS value grammar.
    "declaration-property-value-no-unknown": [
      true,
      {
        ignoreProperties: {
          "/.+/": [tailwindFunctionPattern],
        },
      },
    ],
    "display-notation": "short",
    "function-no-unknown": [
      true,
      {
        ignoreFunctions: tailwindFunctions,
      },
    ],
    // stylelint-config-standard wants `@import url("…")`. Package imports such
    // as Tailwind v4's `@import "tailwindcss"` are resolved by the bundler
    // only in string form.
    "import-notation": "string",
    // `@media (width >= theme(--breakpoint-xl))` is Tailwind v4's way to use
    // a breakpoint where var() is not allowed.
    "media-query-no-invalid": [
      true,
      {
        ignoreFunctions: ["theme"],
      },
    ],
    // `&` inside Tailwind's @custom-variant, @variant and @utility blocks
    // refers to the element the variant or utility is applied to.
    "nesting-selector-no-missing-scoping-root": [
      true,
      {
        ignoreAtRules: ["custom-variant", "utility", "variant"],
      },
    ],
    "no-descending-specificity": null,
    // Prettier owns formatting, as in the ESLint preset's prettier/prettier.
    "prettier/prettier": true,
    // The *-layout-mappings rules (property, unit, value-keyword) are left
    // off: they reject every physical property, unit and keyword (margin-left,
    // vw, float: left) and can only autofix with a per-project
    // languageOptions.directionality setting.
    "relative-selector-nesting-notation": "explicit",
    "selector-no-deprecated": true,
    "selector-no-invalid": true,
    "selector-no-unmatchable": true,
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
  },
};

export default config;
