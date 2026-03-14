import plugin from "@vitest/eslint-plugin";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`vitest/${key}`, "error"])
);

const overrideRules = {
  // Conflicts with prefer-called-once (the original #604 issue)
  "vitest/prefer-called-times": "off",
  "vitest/prefer-to-have-been-called-times": "off",

  // Too strict — matching oxlint jest disabled rules
  "vitest/no-hooks": "off",
  "vitest/require-hook": "off",
  "vitest/no-conditional-in-test": "off",

  // Too strict for general use
  "vitest/require-test-timeout": "off",
  "vitest/prefer-expect-assertions": "off",

  // Project-specific — depends on vitest globals config
  "vitest/prefer-importing-vitest-globals": "off",
  "vitest/no-importing-vitest-globals": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
