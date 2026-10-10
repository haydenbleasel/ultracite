import plugin from "@angular-eslint/eslint-plugin";

import { splitTypeChecked } from "../../core/type-checked.mjs";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@angular-eslint/${key}`, "error"])
);

const overrideRules = {};

// The type-checked rules run in the type-aware add-on. These call the type
// checker without marking themselves `requiresTypeChecking`.
const { syntactic, typeChecked } = splitTypeChecked(
  "@angular-eslint",
  plugin,
  Object.assign(baseRules, overrideRules),
  [
    "no-developer-preview",
    "no-experimental",
    "no-uncalled-signals",
    "prefer-signal-model",
    "prefer-signals",
    "reactive-context-must-read-signal",
  ]
);

export const typeCheckedRules = typeChecked;

export default syntactic;
