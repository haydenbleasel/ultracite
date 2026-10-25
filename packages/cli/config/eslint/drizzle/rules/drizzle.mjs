import plugin from "eslint-plugin-drizzle";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`drizzle/${key}`, "error"])
);

// Without drizzleObjectName the rules report every .delete() and .update()
// call, Map#delete included. db and tx are the names Drizzle uses for a
// database and a transaction, as in the Biome preset.
const drizzleObjectName = ["db", "tx"];

const overrideRules = {
  "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName }],
  "drizzle/enforce-update-with-where": ["error", { drizzleObjectName }],
};

const config = Object.assign(baseRules, overrideRules);

export default config;
