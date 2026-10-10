import { plugin } from "@darraghor/eslint-plugin-nestjs-typed";

import { splitTypeChecked } from "../../core/type-checked.mjs";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@darraghor/nestjs-typed/${key}`, "error"])
);

const overrideRules = {};

// The type-checked rules run in the type-aware add-on. These call the type
// checker without marking themselves `requiresTypeChecking`.
const { syntactic, typeChecked } = splitTypeChecked(
  "@darraghor/nestjs-typed",
  plugin,
  Object.assign(baseRules, overrideRules),
  [
    "all-properties-have-explicit-defined",
    "api-enum-property-best-practices",
    "validated-non-primitive-property-needs-type-decorator",
  ]
);

export const typeCheckedRules = typeChecked;

export default syntactic;
