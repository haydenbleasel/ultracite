import plugin from "eslint-plugin-github";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`github/${key}`, "error"])
);

// Overrides mirror the oxlint core preset (config/oxlint/core), which is the
// benchmark for rule decisions across linters.
const overrideRules = {
  // Conflicts with unicorn/prefer-dom-node-dataset, which is the benchmark.
  "github/no-dataset": "off",
  // oxlint's JS plugin bridge misreads module-scoped declarations (e.g. Astro
  // frontmatter) as implicit globals. Off in both linters to keep parity.
  "github/no-implicit-buggy-globals": "off",
  "github/unescaped-html-literal": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
