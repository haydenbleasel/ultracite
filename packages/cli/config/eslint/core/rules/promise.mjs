import plugin from "eslint-plugin-promise";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`promise/${key}`, "error"])
);

// Overrides mirror the oxlint core config (config/oxlint/core/index.mjs),
// which is the benchmark for rule decisions across linters. always-return
// and catch-or-return are off there because prefer-await-to-then already
// steers code away from .then() chains.
const overrideRules = {
  "promise/always-return": "off",
  "promise/catch-or-return": "off",
  "promise/no-native": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
