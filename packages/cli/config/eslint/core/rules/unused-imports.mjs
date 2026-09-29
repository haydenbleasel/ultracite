import plugin from "eslint-plugin-unused-imports";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`unused-imports/${key}`, "error"])
);

const overrideRules = {
  // A copy of no-unused-vars / @typescript-eslint/no-unused-vars (the oxlint
  // benchmark rule, which stays on) that skips imports, so enabling it
  // reported every unused variable twice. no-unused-imports stays on for its
  // autofix that deletes unused imports.
  "unused-imports/no-unused-vars": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
