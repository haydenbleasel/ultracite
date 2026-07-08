import plugin from "eslint-plugin-n";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`n/${key}`, "error"])
);

// Overrides mirror the oxlint core config (config/oxlint/core/index.mjs),
// which is the benchmark for rule decisions across linters.
const overrideRules = {
  "n/file-extension-in-import": "off",
  "n/no-missing-import": "off",
  "n/no-process-env": "off",
  // Matches unicorn/no-process-exit being off in the oxlint config.
  "n/no-process-exit": "off",
  "n/no-sync": "off",
  "n/no-unpublished-import": "off",
  "n/no-unsupported-features/es-builtins": "off",
  "n/no-unsupported-features/es-syntax": "off",
  "n/no-unsupported-features/node-builtins": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
