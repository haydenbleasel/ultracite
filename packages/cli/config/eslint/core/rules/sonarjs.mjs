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
  // Matches Biome's noExcessiveCognitiveComplexity limit.
  "sonarjs/cognitive-complexity": ["error", 20],
  // Duplicate of the core complexity rule.
  "sonarjs/cyclomatic-complexity": "off",
  "sonarjs/elseif-without-else": "off",
  // Fires on any file whose name differs from an exported class, which is
  // noise for config and module files that export objects, not classes.
  "sonarjs/file-name-differ-from-class": "off",
  // Requires a headerFormat option; errors on every file without one.
  "sonarjs/file-header": "off",
  // No dependency-manifest resolution in oxlint's JS plugin bridge, so this
  // flags builtin (bun:test) and workspace imports as missing dependencies.
  // Off in both linters to keep parity.
  "sonarjs/no-implicit-dependencies": "off",
  // The preset disables max-lines everywhere.
  "sonarjs/max-lines": "off",
  "sonarjs/max-lines-per-function": "off",
  // Duplicate of max-depth, which is off.
  "sonarjs/nested-control-flow": "off",
  // Conflicts with sort-keys.
  "sonarjs/shorthand-property-grouping": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
