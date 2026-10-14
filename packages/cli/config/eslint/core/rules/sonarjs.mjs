import plugin from "eslint-plugin-sonarjs";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`sonarjs/${key}`, "error"])
);

// Overrides mirror the oxlint core preset (config/oxlint/core), which is the
// benchmark for rule decisions across linters.
const overrideRules = {
  // Fights the formatter (arrowParentheses: always).
  "sonarjs/arrow-function-convention": "off",
  // The same number as Biome's noExcessiveCognitiveComplexity limit, but the
  // two score functions differently, so the limits aren't equivalent.
  "sonarjs/cognitive-complexity": ["error", 20],
  // Duplicate of the core complexity rule.
  "sonarjs/cyclomatic-complexity": "off",
  "sonarjs/elseif-without-else": "off",
  // Requires a headerFormat option; errors on every file without one.
  "sonarjs/file-header": "off",
  // Fires on any file whose name differs from an exported class, which is
  // noise for config and module files that export objects, not classes.
  "sonarjs/file-name-differ-from-class": "off",
  // The preset disables max-lines everywhere.
  "sonarjs/max-lines": "off",
  "sonarjs/max-lines-per-function": "off",
  // Duplicate of max-depth, which is off.
  "sonarjs/nested-control-flow": "off",
  // No dependency-manifest resolution in oxlint's JS plugin bridge, so this
  // flags builtin (bun:test) and workspace imports as missing dependencies.
  // Off in both linters to keep parity.
  "sonarjs/no-implicit-dependencies": "off",
  // sonarjs 4.2.1 raised the default threshold to 5; keep the stricter 4.
  "sonarjs/no-nested-functions": ["error", { threshold: 4 }],
  // Conflicts with sort-keys.
  "sonarjs/shorthand-property-grouping": "off",
};

const config = Object.assign(baseRules, overrideRules);

// SonarJS marks the rules that use type information with
// `meta.docs.requiresTypeChecking`. Most of them register nothing without a
// TypeScript program, so they run only with the type-aware preset. These
// marked rules also check the syntax tree, using types only where there are
// some, so core keeps them, and so does the Oxlint js-plugins preset. The
// ESLint smoke test checks this list against the installed plugin.
export const worksWithoutTypes = new Set([
  "anchor-precedence",
  "arguments-order",
  "bitwise-operators",
  "class-prototype",
  "concise-regex",
  "disabled-auto-escaping",
  "dompurify-unsafe-config",
  "duplicates-in-character-class",
  "empty-string-repetition",
  "no-collection-size-mischeck",
  "no-control-regex",
  "no-empty-after-reluctant",
  "no-empty-alternatives",
  "no-empty-character-class",
  "no-empty-group",
  "no-inconsistent-returns",
  "no-invalid-regexp",
  "no-misleading-character-class",
  "no-redundant-optional",
  "no-regex-spaces",
  "no-require-or-define",
  "no-small-switch",
  "prefer-immediate-return",
  "reduce-initial-value",
  "regex-complexity",
  "single-char-in-character-classes",
  "single-character-alternation",
  "slow-regex",
  "sql-queries",
  "unicode-aware-regex",
  "unused-import",
  "void-use",
]);

const needsTypes = (key) => {
  const name = key.slice("sonarjs/".length);

  return (
    rules[name]?.meta?.docs?.requiresTypeChecking === true &&
    !worksWithoutTypes.has(name)
  );
};

const pickRules = (typeChecked) =>
  Object.fromEntries(
    Object.entries(config).filter(([key]) => needsTypes(key) === typeChecked)
  );

/** The rules core runs, which work without type information. */
export const syntacticRules = pickRules(false);

/** The rules the type-aware preset adds, which need a TypeScript program. */
export const typeCheckedRules = pickRules(true);

export default config;
