import pluginStart from "@tanstack/eslint-plugin-start";

import { splitTypeChecked } from "../../core/type-checked.mjs";

const { rules } = pluginStart;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key]?.meta?.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@tanstack/start/${key}`, "error"])
);

// The type-checked rules run in the type-aware add-on. These call the type
// checker without marking themselves `requiresTypeChecking`.
const { syntactic, typeChecked } = splitTypeChecked(
  "@tanstack/start",
  pluginStart,
  baseRules,
  ["no-async-client-component", "no-client-code-in-server-component"]
);

export const typeCheckedRules = typeChecked;

export default syntactic;
