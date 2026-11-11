import plugin from "eslint-plugin-vue";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`vue/${key}`, "error"])
);

// Overrides mirror the oxlint vue preset (config/oxlint/vue), which is the
// benchmark for rule decisions across linters.
const overrideRules = {
  // With no options the rule only allows blocks without a `lang` attribute,
  // which rejects every `<script lang="ts">`. Allow TypeScript scripts and the
  // style languages the Stylelint preset parses.
  "vue/block-lang": [
    "error",
    {
      script: { allowNoLang: true, lang: "ts" },
      style: { allowNoLang: true, lang: ["less", "scss"] },
    },
  ],
  // Off to match the oxlint vue preset, where it defaults to a single prop per
  // component. In eslint-plugin-vue it has no default, so it reports nothing
  // without options.
  "vue/max-props": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
