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
  // Crashes under ESLint 10 (uses the removed context.getSourceCode());
  // forwardRef is deprecated in React 19 and
  // react-doctor/no-react19-deprecated-apis covers it.
  "react/forward-ref-uses-ref": "off",
  "react/function-component-definition": [
    "error",
    {
      namedComponents: "arrow-function",
    },
  ],
  "react/jsx-boolean-value": "off",
  // Off in the oxlint react config, and its implementation uses the
  // removed context.getFilename() under ESLint 10.
  "react/jsx-filename-extension": "off",
  "react/jsx-max-depth": "off",
  "react/jsx-max-props-per-line": "off",
  "react/jsx-newline": "off",
  "react/jsx-no-bind": "off",
  "react/jsx-no-literals": "off",
  "react/jsx-one-expression-per-line": "off",
  "react/jsx-props-no-spreading": "off",
  "react/jsx-sort-props": "off",
  "react/no-array-index-key": "off",
  "react/no-arrow-function-lifecycle": "off",
  "react/no-invalid-html-attribute": "off",
  "react/no-multi-comp": "off",
  "react/no-unknown-property": "off",
  "react/no-unused-class-component-methods": "off",
  "react/only-export-components": "off",
  "react/react-in-jsx-scope": "off",
  "react/require-default-props": "off",
};

const config = Object.assign(baseRules, overrideRules);

export default config;
