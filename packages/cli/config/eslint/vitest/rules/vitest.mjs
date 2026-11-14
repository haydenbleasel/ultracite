import plugin from "@vitest/eslint-plugin";

import { splitTypeChecked } from "../../core/type-checked.mjs";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`vitest/${key}`, "error"])
);

const overrideRules = {
  // Too strict — matching oxlint jest disabled rules
  "vitest/no-conditional-in-test": "off",
  "vitest/no-hooks": "off",

  // Explicit imports are preferred over globals
  "vitest/no-importing-vitest-globals": "off",

  // Reports `test` and `expect` imported from another runner as globals, and
  // its fix adds a second, clashing import from vitest. This preset covers
  // every *.test and *.spec file, so that rewrote the Playwright (and
  // bun:test, node:test) files of a project that also uses Vitest.
  "vitest/prefer-importing-vitest-globals": "off",

  // Conflicts with prefer-called-once (the original #604 issue)
  "vitest/prefer-called-times": "off",

  // Too strict for general use
  "vitest/prefer-expect-assertions": "off",

  // Conflicts with prefer-describe-function-title — function names aren't lowercase strings
  "vitest/prefer-lowercase-title": "off",

  // Conflicts with prefer-to-be-truthy and prefer-to-be-falsy (#645)
  // prefer-strict-boolean-matchers: use toBe(true)/toBe(false)
  // prefer-to-be-truthy/falsy: use toBeTruthy()/toBeFalsy()
  "vitest/prefer-strict-boolean-matchers": "off",

  // Too strict — matching oxlint jest disabled rules
  "vitest/require-hook": "off",
  "vitest/require-test-timeout": "off",

  // Conflicts with prefer-describe-function-title — function refs aren't string titles (#665)
  "vitest/valid-title": "off",
};

// The type-checked rules (marked `requiresTypeChecking`) run in the
// type-aware add-on. So does prefer-describe-function-title, which isn't
// marked: with `settings.vitest.typecheck` on, as the preset has it, the rule
// asks the type checker whether a describe title names an imported class or
// function, and without type information that throws and ends the run.
const { syntactic, typeChecked } = splitTypeChecked(
  "vitest",
  plugin,
  Object.assign(baseRules, overrideRules),
  ["prefer-describe-function-title"]
);

export const typeCheckedRules = typeChecked;

export default syntactic;
