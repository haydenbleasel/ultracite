import plugin from "eslint-plugin-playwright";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`playwright/${key}`, "error"])
);

const overrideRules = {
  // Hooks such as beforeEach are how Playwright tests share setup, and
  // prefer-hooks-on-top and prefer-hooks-in-order already keep them in order.
  "playwright/no-hooks": "off",
  // Makes every assertion expect.soft(), so a failed check no longer stops
  // the test. Whether a check is soft is a choice per assertion.
  "playwright/require-soft-assertions": "off",
  // Tags are each project's own convention; this reports every untagged test.
  "playwright/require-tags": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
