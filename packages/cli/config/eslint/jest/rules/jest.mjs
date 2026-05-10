import plugin from "eslint-plugin-jest";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`jest/${key}`, "error"])
);

const overrideRules = {
  // Mock factories use conditionals for path-based routing
  "jest/no-conditional-in-test": "off",
  // bun:test uses beforeEach hooks for mock.restore()
  "jest/no-hooks": "off",
  // Too strict for general use — not all tests need explicit assertion counts
  "jest/prefer-expect-assertions": "off",
  // bun:test mock.module() must be called at top level
  "jest/require-hook": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
