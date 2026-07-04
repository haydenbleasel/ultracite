import plugin from "eslint-plugin-svelte";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`svelte/${key}`, "error"])
);

// prettier-plugin-svelte owns formatting for .svelte files, so keep the
// formatting rules that the plugin's own prettier preset disables off.
const prettierConfig = plugin.configs["flat/prettier"];
const prettierOverrides = Object.fromEntries(
  (Array.isArray(prettierConfig) ? prettierConfig : [prettierConfig])
    .flatMap((entry) => Object.entries(entry.rules ?? {}))
    .filter(([key]) => key.startsWith("svelte/"))
);

const config = Object.assign(baseRules, prettierOverrides);

export default config;
