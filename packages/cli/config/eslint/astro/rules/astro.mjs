import { rules } from "eslint-plugin-astro";

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`astro/${key}`, "error"])
);

const overrideRules = {};

const config = Object.assign(baseRules, overrideRules);

export default config;
