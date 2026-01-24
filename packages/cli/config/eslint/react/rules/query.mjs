import plugin from "@tanstack/eslint-plugin-query";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@tanstack/query/${key}`, "error"])
);

const overrideRules = {};

const config = Object.assign(baseRules, overrideRules);

export default config;
