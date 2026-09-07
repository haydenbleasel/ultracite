import plugin from "eslint-plugin-github";

import { githubFilenameRegex } from "../../../shared/filenames.mjs";

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
  // Keep filename enforcement enabled while accepting TanStack Router's
  // documented file-route grammar when one of its routing tokens is present.
  "github/filenames-match-regex": ["error", githubFilenameRegex],
  // Conflicts with unicorn/prefer-dom-node-dataset, which is the benchmark.
  "github/no-dataset": "off",
  // oxlint's JS plugin bridge misreads module-scoped declarations (e.g. Astro
  // frontmatter) as implicit globals. Off in both linters to keep parity.
  "github/no-implicit-buggy-globals": "off",
  "github/unescaped-html-literal": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
