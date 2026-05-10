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

  // Explicit imports are preferred over globals
  "vitest/no-importing-vitest-globals": "off",

  // Conflicts with prefer-called-once (the original #604 issue)
  "vitest/prefer-called-times": "off",

  // Too strict for general use
  "vitest/prefer-expect-assertions": "off",

  // Conflicts with prefer-describe-function-title — function names aren't lowercase strings
  "vitest/prefer-lowercase-title": "off",

  // Conflicts with prefer-to-be-truthy and prefer-to-be-falsy (#645)
  // prefer-strict-boolean-matchers: use toBe(true)/toBe(false)
  // prefer-to-be-truthy/falsy: use toBeTruthy()/toBeFalsy()
  "vitest/prefer-strict-boolean-matchers": "off",

  // Too strict — matching oxlint jest disabled rules
  "vitest/require-hook": "off",
  "vitest/require-test-timeout": "off",

  // Conflicts with prefer-describe-function-title — function refs aren't string titles (#665)
  "vitest/valid-title": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
