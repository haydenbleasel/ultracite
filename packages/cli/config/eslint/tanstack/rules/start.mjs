import pluginStart from "@tanstack/eslint-plugin-start";

const { rules } = pluginStart;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key]?.meta?.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@tanstack/start/${key}`, "error"])
);

export default { ...baseRules };
