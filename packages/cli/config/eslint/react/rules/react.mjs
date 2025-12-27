import plugin from "eslint-plugin-react";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`react/${key}`, "error"])
);

const overrideRules = {
  "react/forbid-component-props": "off",
  "react/function-component-definition": [
    "error",
    {
      namedComponents: "arrow-function",
    },
  ],
  "react/no-array-index-key": "off",
  "react/no-arrow-function-lifecycle": "off",
  "react/no-invalid-html-attribute": "off",
  "react/no-multi-comp": "off",
  "react/no-unused-class-component-methods": "off",
  "react/react-in-jsx-scope": "off",
  "react/require-default-props": "off",
  "react/jsx-filename-extension": [
    "error",
    {
      extensions: [".tsx"],
    },
  ],
  "react/jsx-max-depth": "off",
  "react/jsx-max-props-per-line": "off",
  "react/jsx-newline": "off",
  "react/jsx-no-bind": "off",
  "react/jsx-no-literals": "off",
  "react/jsx-one-expression-per-line": "off",
  "react/jsx-props-no-spreading": "off",
  "react/jsx-sort-props": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
