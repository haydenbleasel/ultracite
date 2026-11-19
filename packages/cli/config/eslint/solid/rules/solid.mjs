import plugin from "eslint-plugin-solid";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`solid/${key}`, "error"])
);

const overrideRules = {
  // Reports APIs Solid 2.0 removed (`onMount`, `batch`, `mergeProps`,
  // imports from `solid-js/web`) in every project, whatever
  // `settings.solid.version` says, so on Solid 1.x it reports correct code.
  // Back on once the plugin checks the installed version.
  "solid/removed-api": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
