import plugin from "eslint-plugin-promise";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`promise/${key}`, "error"])
);

// Overrides mirror the oxlint core config (config/oxlint/core/index.mjs),
// which is the benchmark for rule decisions across linters.
const overrideRules = {
  "promise/no-native": "off",
  // Matches `.then()`, `.catch()` and `.finally()` by name, so it reports
  // non-promise APIs such as Zod's `.catch()` fallback, and has no type
  // information to tell them apart (oxc-project/oxc#22161, #854).
  // always-return and catch-or-return still check promise chains.
  "promise/prefer-await-to-then": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
