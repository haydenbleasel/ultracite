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

const overrideRules = {
  // With no options the rule only allows blocks without a `lang` attribute,
  // which rejects every `<script lang="ts">`. Allow TypeScript scripts and the
  // style languages the Stylelint preset parses.
  "svelte/block-lang": [
    "error",
    { script: [null, "ts"], style: [null, "less", "scss"] },
  ],
  // Requires a user-supplied list of elements to restrict; its schema
  // rejects a bare "error" with no options.
  "svelte/no-restricted-html-elements": "off",
};

const config = Object.assign(baseRules, prettierOverrides, overrideRules);

export default config;
