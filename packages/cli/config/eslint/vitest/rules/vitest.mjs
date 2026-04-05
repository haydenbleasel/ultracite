import plugin from "@vitest/eslint-plugin";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`vitest/${key}`, "error"])
);

const overrideRules = {
  // Too strict — matching oxlint jest disabled rules
  "vitest/no-conditional-in-test": "off",
  "vitest/no-hooks": "off",

  // Project-specific — depends on vitest globals config
  "vitest/no-importing-vitest-globals": "off",

  // Conflicts with prefer-called-once (the original #604 issue)
  "vitest/prefer-called-times": "off",

  // Too strict for general use
  "vitest/prefer-expect-assertions": "off",
  "vitest/prefer-importing-vitest-globals": "off",

  // Conflicts with prefer-to-be-truthy and prefer-to-be-falsy (#645)
  // prefer-strict-boolean-matchers: use toBe(true)/toBe(false)
  // prefer-to-be-truthy/falsy: use toBeTruthy()/toBeFalsy()
  "vitest/prefer-strict-boolean-matchers": "off",

  // Too strict for general use
  "vitest/prefer-to-have-been-called-times": "off",

  // Too strict — matching oxlint jest disabled rules
  "vitest/require-hook": "off",
  "vitest/require-test-timeout": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
