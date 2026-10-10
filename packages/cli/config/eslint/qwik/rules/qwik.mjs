import plugin from "eslint-plugin-qwik";

import { splitTypeChecked } from "../../core/type-checked.mjs";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`qwik/${key}`, "error"])
);

const overrideRules = {};

// The type-checked rules run in the type-aware add-on. These call the type
// checker without marking themselves `requiresTypeChecking`.
const { syntactic, typeChecked } = splitTypeChecked(
  "qwik",
  plugin,
  Object.assign(baseRules, overrideRules),
  ["valid-lexical-scope"]
);

export const typeCheckedRules = typeChecked;

export default syntactic;
