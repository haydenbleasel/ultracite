import typescript from "@typescript-eslint/eslint-plugin";

const { rules } = typescript;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@typescript-eslint/${key}`, "error"])
);

// Overrides mirror the oxlint core config (config/oxlint/core/index.mjs),
// which is the benchmark for rule decisions across linters. Notably,
// consistent-type-definitions is left at its default ("interface"),
// matching oxlint and Biome's useConsistentTypeDefinitions.
const overrideRules = {
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/explicit-member-accessibility": "off",
  "@typescript-eslint/explicit-module-boundary-types": "off",
  "@typescript-eslint/init-declarations": "off",
  // Matches max-params being off in the oxlint config.
  "@typescript-eslint/max-params": "off",
  "@typescript-eslint/naming-convention": [
    "error",
    {
      format: ["camelCase", "PascalCase", "snake_case"],
      selector: "default",
    },
    {
      format: null,
      modifiers: ["requiresQuotes"],
      selector: "objectLiteralProperty",
    },
  ],
  "@typescript-eslint/no-magic-numbers": "off",
  "@typescript-eslint/no-require-imports": "off",
  "@typescript-eslint/prefer-readonly-parameter-types": "off",
  // Kept on even though oxlint sets typescript/require-await off — oxlint
  // applies the base require-await rule to TS files natively, so this is
  // the behavioral equivalent here.
  "@typescript-eslint/require-await": "error",
  "@typescript-eslint/return-await": ["error", "always"],
};

const config = Object.assign(baseRules, overrideRules);

// The rules that need type information, as typescript-eslint lists them in
// the config that turns them off.
const typeCheckedRuleNames = new Set(
  Object.keys(typescript.configs["flat/disable-type-checked"].rules)
);

const pickRules = (typeChecked) =>
  Object.fromEntries(
    Object.entries(config).filter(
      ([key]) => typeCheckedRuleNames.has(key) === typeChecked
    )
  );

/** The rules core runs, which work from the syntax tree alone. */
export const syntacticRules = pickRules(false);

/** The rules the type-aware preset adds, which need a TypeScript program. */
export const typeCheckedRules = pickRules(true);

export default config;
