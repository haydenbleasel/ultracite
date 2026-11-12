import { rules } from "eslint-plugin-react-hooks";

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`react-hooks/${key}`, "error"])
);

// exhaustive-deps is an error by policy, though the plugin's own config
// warns: the report is usually right about the array.
//
// Two of the compiler rules can't report yet. exhaustive-effect-dependencies
// sits behind a flag that eslint-plugin-react-hooks 7.1 builds as off, and
// memoized-effect-dependencies has no diagnostics. They stay on for the
// release that switches them on; the oxlint react preset's
// exhaustive-effect-dependencies already reports.
const overrideRules = {};

const config = Object.assign(baseRules, overrideRules);

export default config;
