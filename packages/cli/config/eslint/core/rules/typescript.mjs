import typescript from "@typescript-eslint/eslint-plugin";

const { rules } = typescript;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`@typescript-eslint/${key}`, "error"])
);

const overrideRules = {
  "@typescript-eslint/consistent-type-definitions": ["error", "type"],
  "@typescript-eslint/explicit-function-return-type": "off",
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
  "@typescript-eslint/no-confusing-void-expression": "off",
  "@typescript-eslint/no-magic-numbers": "off",
  "@typescript-eslint/no-misused-promises": "off",
  "@typescript-eslint/prefer-readonly": "off",
  "@typescript-eslint/prefer-readonly-parameter-types": "off",
  "@typescript-eslint/strict-boolean-expressions": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
