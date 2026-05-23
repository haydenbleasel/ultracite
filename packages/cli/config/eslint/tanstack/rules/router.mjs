import pluginRouter from "@tanstack/eslint-plugin-router";

const { rules } = pluginRouter;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key]?.meta?.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@tanstack/router/${key}`, "error"])
);

export default { ...baseRules };
